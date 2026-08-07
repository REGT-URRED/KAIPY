/* ============================================
   API / routes / reports
   Contrato REST estilo Open311 (GeoReport):
   - GET  /api/reports           listado con filtros
   - GET  /api/reports/:id       detalle
   - POST /api/reports           crear reporte anonimo
   - POST /api/reports/:id/vote  "Yo tambien lo vi" (+1)
   ============================================ */
import { Router } from "express";
import * as db from "../db.js";
import { rateLimit, validateReport } from "../middleware.js";
import { LIMITS } from "../config.js";
import { broadcast } from "./events.js";
import { matchBlockedTerm } from "../filters/keywords.js";
import { checkImage } from "../filters/nsfw.js";
import { reencodePhoto } from "../filters/image.js";

const router = Router();

// Listado paginado. La foto viaja re-encodeada por el servidor
// (JPEG <=900px, sin EXIF) -> payload acotado; la paginacion
// (max. 100) pone el techo duro a la respuesta.
router.get("/", async (req, res, next) => {
  try {
    let list = await db.all();
    const { category, state, q } = req.query;

    if (category && category !== "Todas") {
      list = list.filter((r) => r.category === category);
    }
    if (state && state !== "Todos") {
      list = list.filter((r) => r.state === state);
    }
    if (q) {
      const needle = String(q).toLowerCase();
      list = list.filter((r) =>
        (r.title || "").toLowerCase().indexOf(needle) !== -1 ||
        (r.description || "").toLowerCase().indexOf(needle) !== -1
      );
    }

    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const limit = Math.min(
      LIMITS.listMaxPageSize,
      Math.max(1, parseInt(req.query.limit, 10) || LIMITS.listPageSize)
    );
    const page = list.slice(offset, offset + limit);
    // internals de auditoria/dedupe no salen en el listado
    const stripped = page.map((r) => {
      const { voters, photoHash, gridKey, ...rest } = r;
      return rest;
    });

    res.json({
      total: list.length,
      offset,
      limit,
      reports: stripped
    });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const report = await db.get(req.params.id);
    if (!report) { return res.status(404).json({ error: "Reporte no encontrado." }); }
    const { voters, photoHash, gridKey, ...rest } = report;
    res.json(rest);
  } catch (err) { next(err); }
});

router.post("/", rateLimit("create", LIMITS.createPerMinute), async (req, res, next) => {
  try {
    const error = validateReport(req.body);
    if (error) { return res.status(400).json({ error }); }

    // 1) Filtro por texto: terminos explicitos en titulo/descripcion.
    const keyword = matchBlockedTerm(req.body.title, req.body.description);
    if (keyword) {
      return res.status(422).json({ error: "Contenido inapropiado." });
    }

    // 2) Filtro principal: clasificador NSFW sobre la foto.
    //    Si el modelo no cargo ("unavailable") se deja pasar:
    //    el anonimo legitimo nunca queda bloqueado por un fallo
    //    del filtro, y el puntaje se guarda como auditoria.
    let nsfwScore = null;
    let photo = req.body.photo;
    let photoHash = null;
    if (photo) {
      const nsfw = await checkImage(photo);
      if (nsfw.verdict === "block") {
        return res.status(422).json({ error: "La foto contiene contenido inapropiado y no se publico." });
      }
      if (nsfw.verdict === "allow") { nsfwScore = nsfw.score; }

      // Hash del ORIGINAL (para dedupe de subidas identicas) y
      // re-encode: JPEG <=900px sin EXIF (mata GPS de la foto).
      photoHash = db.photoHash(photo);
      try {
        photo = await reencodePhoto(photo);
      } catch {
        return res.status(400).json({ error: "La foto no se pudo procesar. Usa otra." });
      }
    }

    // 3) Dedupe global (misma foto o misma zona+categoria).
    const created = await db.create({ ...req.body, photo }, { nsfwScore, keyword, photoHash });
    if (created.error === "duplicate-photo") {
      return res.status(409).json({ error: "Esta foto ya fue reportada." });
    }
    if (created.error === "duplicate-area") {
      return res.status(409).json({ error: "Ya existe un reporte similar en esta zona." });
    }

    broadcast({ type: "report:new", report: created.report });
    res.status(201).json(created.report);
  } catch (err) { next(err); }
});

router.post("/:id/vote", rateLimit("vote", LIMITS.votePerMinute), async (req, res, next) => {
  try {
    // deviceId: huella anonima opcional (nunca una credencial).
    // Un solo voto por dispositivo + reporte; sin deviceId el
    // rate-limit por IP sigue como red de seguridad.
    const deviceId = typeof req.body.deviceId === "string" && req.body.deviceId.length <= 64
      ? req.body.deviceId
      : null;
    const result = await db.vote(req.params.id, deviceId);
    if (result === null) { return res.status(404).json({ error: "Reporte no encontrado." }); }
    broadcast({ type: "report:vote", id: req.params.id, votes: result.votes });
    res.json({ votes: result.votes, already: !result.counted });
  } catch (err) { next(err); }
});

export default router;
