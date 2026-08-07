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

const router = Router();

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
    res.json(list);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const report = await db.get(req.params.id);
    if (!report) { return res.status(404).json({ error: "Reporte no encontrado." }); }
    res.json(report);
  } catch (err) { next(err); }
});

router.post("/", rateLimit("create", LIMITS.createPerMinute), async (req, res, next) => {
  try {
    const error = validateReport(req.body);
    if (error) { return res.status(400).json({ error }); }

    const report = await db.create(req.body);
    broadcast({ type: "report:new", report });
    res.status(201).json(report);
  } catch (err) { next(err); }
});

router.post("/:id/vote", rateLimit("vote", LIMITS.votePerMinute), async (req, res, next) => {
  try {
    const votes = await db.vote(req.params.id);
    if (votes === null) { return res.status(404).json({ error: "Reporte no encontrado." }); }
    broadcast({ type: "report:vote", id: req.params.id, votes });
    res.json({ votes });
  } catch (err) { next(err); }
});

export default router;
