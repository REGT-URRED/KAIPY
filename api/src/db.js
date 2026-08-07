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
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { seed, DEDUPE } from "./config.js";
import { cleanText } from "./middleware.js";

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

// Hash sha256 de la foto (dataURL) para dedupe global.
// meta.photoHash viaja desde la ruta: se calcula sobre la
// foto ORIGINAL (antes del re-encode) para que dos subidas
// identicas compartan hash aunque el re-encode difiera.
export function photoHash(photo) {
  return photo ? createHash("sha256").update(photo).digest("hex") : null;
}

// Celda de grilla ~110m (lat/lon a N decimales) para dedupe por zona.
function gridKey(lat, lon, digits) {
  if (lat == null || lon == null) { return null; }
  return Number(lat).toFixed(digits) + "," + Number(lon).toFixed(digits);
}

// Crea un reporte con dedupe GLOBAL (dentro del lock, para que
// dos peticiones simultaneas no pasen el check). Devuelve
// { report } o { error: "duplicate-photo" | "duplicate-area" }.
// meta (opcional): { nsfwScore, keyword } — auditoria del filtro.
export async function create(input, meta) {
  return withLock(async () => {
    const list = await read();
    const now = Date.now();
    // Mismo hash que se guardara: el del ORIGINAL si la ruta lo
    // manda (meta.photoHash), si no el de lo que llego aca.
    const phash = (meta && meta.photoHash) || photoHash(input.photo);
    const gkey = gridKey(input.lat, input.lon, DEDUPE.gridDigits);

    for (const r of list) {
      const age = now - Date.parse(r.createdAt);
      if (age > DEDUPE.windowMs) { continue; }
      if (phash && r.photoHash === phash) { return { error: "duplicate-photo" }; }
      if (gkey && r.gridKey === gkey && r.category === input.category) { return { error: "duplicate-area" }; }
    }

    const report = {
      id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: cleanText(input.title, 120),
      description: cleanText(input.description, 1000),
      category: input.category,
      lat: input.lat == null ? null : Number(input.lat),
      lon: input.lon == null ? null : Number(input.lon),
      photo: input.photo || null,
      photoHash: (meta && meta.photoHash) || photoHash(input.photo),
      gridKey: gkey,
      votes: 0,
      voters: [],
      state: "open",
      createdAt: new Date().toISOString(),
      moderation: {
        nsfwScore: meta && meta.nsfwScore != null ? meta.nsfwScore : null,
        keyword: meta && meta.keyword ? meta.keyword : null
      }
    };
    list.push(report);
    await writeAtomic(list);
    return { report };
  });
}

// Voto "Yo tambien lo vi" anonimo. deviceId es opcional y
// NO es una credencial: solo evita que el mismo dispositivo
// infle un reporte. Devuelve { votes, counted } donde
// counted=false si el dispositivo ya habia votado.
export async function vote(id, deviceId) {
  return withLock(async () => {
    const list = await read();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        const report = list[i];
        if (deviceId && Array.isArray(report.voters) && report.voters.indexOf(deviceId) !== -1) {
          return { votes: report.votes || 0, counted: false };
        }
        if (!Array.isArray(report.voters)) { report.voters = []; }
        // ponytail: voters[] acotado a 2000 para no crecer sin limite;
        // mas alla, el dedupe degrada (siempre cuenta). El rate-limit
        // por IP+device ya frena el abuso masivo.
        if (deviceId && report.voters.length < 2000) { report.voters.push(deviceId); }
        report.votes = (report.votes || 0) + 1;
        await writeAtomic(list);
        return { votes: report.votes, counted: true };
      }
    }
    return null;
  });
}
