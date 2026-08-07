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
import { PORT, CORS_ORIGIN, LIMITS } from "./src/config.js";
import { ensureReady } from "./src/db.js";
import reportsRouter from "./src/routes/reports.js";
import statsRouter from "./src/routes/stats.js";
import eventsRouter from "./src/routes/events.js";

// Crea db.json (con seed) la primera vez
await ensureReady();

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: "3mb" }));

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
});
