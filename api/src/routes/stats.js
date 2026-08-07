/* ============================================
   API / routes / stats
   Resumen agregado: totales por estado, apoyo
   colectivo y conteo por categoria.
   ============================================ */
import { Router } from "express";
import * as db from "../db.js";
import { categories } from "../config.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const list = await db.all();

    const byState = { open: 0, review: 0, resolved: 0 };
    const byCategory = {};
    let votes = 0;

    list.forEach((r) => {
      if (byState[r.state] != null) { byState[r.state] += 1; }
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      votes += r.votes || 0;
    });

    // Categorias vacias aparecen con 0 (para graficas estables)
    categories.forEach((c) => { byCategory[c] = byCategory[c] || 0; });

    const top = list.slice().sort((a, b) => (b.votes || 0) - (a.votes || 0))[0] || null;

    res.json({
      total: list.length,
      byState,
      byCategory,
      votes,
      top: top && top.votes ? { id: top.id, title: top.title, votes: top.votes } : null
    });
  } catch (err) { next(err); }
});

export default router;
