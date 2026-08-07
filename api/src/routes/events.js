/* ============================================
   API / events (SSE)
   Tiempo real multiusuario: Server-Sent Events.
   El servidor hace broadcast de "reporte nuevo"
   y "voto registrado" a todos los clientes.
   Unidireccional (servidor -> cliente), suficiente
   para este caso de uso (patron Ushahidi/Waze).
   ============================================ */
import { Router } from "express";

const router = Router();
const clients = new Set();

// Heartbeat: mantiene viva la conexion a traves de proxies
// que cierran streams inactivos (nginx sin read_timeout alto).
setInterval(() => {
  clients.forEach((res) => {
    try { res.write(": ping\n\n"); } catch (e) { clients.delete(res); }
  });
}, 25000).unref();

export function broadcast(payload) {
  const msg = "data: " + JSON.stringify(payload) + "\n\n";
  clients.forEach((res) => {
    try { res.write(msg); } catch (e) { clients.delete(res); }
  });
}

router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write("data: " + JSON.stringify({ type: "ready" }) + "\n\n");
  clients.add(res);

  req.on("close", () => clients.delete(res));
});

export default router;
