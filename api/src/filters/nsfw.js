/* ============================================
   API / filters / nsfw
   Filtro principal: deteccion de contenido
   explicito (pornografia) en fotos de reportes.
   Clasificador ViT (AdamCodd/vit-base-nsfw-detector,
   Apache-2.0, AUC 0.995) via transformers.js:
   ONNX int8 + WASM, cero binarios nativos (funciona
   en Windows/Linux sin compilacion).
   Degradacion controlada: si el modelo no carga,
   el filtro se apaga (verdict "unavailable") y la
   app sigue funcionando para el usuario anonimo.
   ============================================ */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, pipeline, RawImage } from "@huggingface/transformers";
import { NSFW } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
env.cacheDir = path.join(__dirname, "..", "..", "data", "models", "hf");
env.allowLocalModels = false;

let classifier = null; // null = sin cargar aun; false = fallo (filtro apagado)
let loadPromise = null; // guarda anti-carrera: una sola carga a la vez

export function ensureClassifier() {
  if (classifier || !NSFW.enabled) { return classifier || null; }
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        classifier = await pipeline("image-classification", NSFW.modelId, {
          dtype: NSFW.dtype,
          device: "cpu"
        });
        console.log("NSFW: modelo cargado (" + NSFW.modelId + ", umbral " + NSFW.threshold + ")");
      } catch (err) {
        console.error("NSFW: no se pudo cargar el modelo, filtro desactivado:", err.message);
        classifier = false;
      } finally {
        loadPromise = null;
      }
    })();
  }
  return loadPromise;
}

// Clasifica una foto (dataURL). Devuelve:
// { verdict: "allow" | "block" | "unavailable", score, labels }
export async function checkImage(dataUrl) {
  const model = await ensureClassifier();
  if (!model) { return { verdict: "unavailable", score: 0, labels: [] }; }

  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const img = await RawImage.read(new Blob([Buffer.from(b64, "base64")]));
  const out = await model(img);

  const hit = out.find((o) => /nsfw/i.test(o.label));
  const score = hit ? hit.score : 0;
  return {
    verdict: score >= NSFW.threshold ? "block" : "allow",
    score: Math.round(score * 10000) / 10000,
    labels: out
  };
}
