/* ============================================
   API / db
   Persistencia en archivo JSON (demo, cero
   instalacion externa). Se lee completo a
   memoria y se escribe atomico (tmp + rename).
   Las mutaciones se serializan con un lock para
   no perder escrituras concurrentes.
   ============================================ */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seed } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let cache = null;
let lock = Promise.resolve();

function withLock(fn) {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
}

async function writeAtomic(list) {
  cache = list;
  const tmp = DB_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

export async function ensureReady() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await writeAtomic(seed());
  }
}

async function read() {
  if (cache) { return cache; }
  const raw = await fs.readFile(DB_FILE, "utf8");
  cache = JSON.parse(raw) || [];
  return cache;
}

export async function all() {
  const list = await read();
  // Ordenados por fecha descendente (igual que storage.js frontend)
  return list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function get(id) {
  const list = await read();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) { return list[i]; }
  }
  return null;
}

export async function create(input) {
  return withLock(async () => {
    const list = await read();
    const report = {
      id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: String(input.title || "").trim(),
      description: String(input.description || "").trim(),
      category: input.category,
      lat: input.lat == null ? null : Number(input.lat),
      lon: input.lon == null ? null : Number(input.lon),
      photo: input.photo || null,
      votes: 0,
      state: "open",
      createdAt: new Date().toISOString()
    };
    list.push(report);
    await writeAtomic(list);
    return report;
  });
}

export async function vote(id) {
  return withLock(async () => {
    const list = await read();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i].votes = (list[i].votes || 0) + 1;
        await writeAtomic(list);
        return list[i].votes;
      }
    }
    return null;
  });
}
