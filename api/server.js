/* ============================================
   API / server
   Bootstrap del backend demo de kaipy.
   Endpoints:
   - GET  /api/health           estado
   - GET  /api/reports          listado + filtros
   - GET  /api/reports/:id      detalle
   - POST /api/reports          crear reporte
   - POST /api/reports/:id/vote apoyo
   - GET  /api/stats            agregados
   - GET  /api/events           SSE (tiempo real)
   ============================================ */
import express from "express";
import cors from "cors";
import { PORT, CORS_ORIGIN, TRUST_PROXY } from "./src/config.js";
import { ensureReady } from "./src/db.js";
import { ensureClassifier } from "./src/filters/nsfw.js";
import reportsRouter from "./src/routes/reports.js";
import statsRouter from "./src/routes/stats.js";
import eventsRouter from "./src/routes/events.js";

// Crea db.json (con seed) la primera vez
await ensureReady();

const app = express();

app.set("trust proxy", TRUST_PROXY);

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "3mb" }));

// Headers de seguridad (equivalente minimo de helmet, cero deps)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Powered-By", "");
  next();
});

// Guard de Content-Type en mutaciones: solo JSON.
// (Sin cookies no hay CSRF clasico, pero rechaza
// body form-urlencoded que express.json ignoraria.)
app.post(["/api/reports", "/api/reports/*/vote"], (req, res, next) => {
  if (!req.is("application/json")) {
    return res.status(415).json({ error: "Content-Type debe ser application/json." });
  }
  next();
});

// Log simple de solicitudes (util para demo)
app.use((req, res, next) => {
  console.log(req.method, req.originalUrl);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, name: "kaipy-api", version: "0.1.0" });
});

app.use("/api/reports", reportsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/events", eventsRouter);

// 404 JSON para rutas desconocidas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

// Manejo central de errores (OWASP: no filtrar detalles internos)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log("kaipy API escuchando en http://localhost:" + PORT);
  // Precarga el clasificador NSFW en segundo plano: la primera
  // clasificacion ya no espera la descarga/compilacion del modelo.
  ensureClassifier().catch(() => {});
});
