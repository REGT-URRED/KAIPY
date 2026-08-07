/* ============================================
   API / filters / image
   Re-encode de fotos en el servidor con sharp
   (dependencia ya presente via transformers.js,
   cero deps nuevas). Normaliza a JPEG 900px q0.8
   y DESCARTADA los metadatos EXIF (incluido el GPS
   que el telefono incrusta): espejo del re-encode
   del cliente, pero en la frontera real.
   ============================================ */
import sharp from "sharp";

const JPEG_MAX_EDGE = 900;
const JPEG_QUALITY = 80;

// dataURL -> dataURL JPEG re-encodeada. Lanza si la
// imagen esta corrupta (el validador ya aseguro el
// MIME y el base64; aca se decodifica de verdad).
export async function reencodePhoto(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const buf = Buffer.from(b64, "base64");

  const out = await sharp(buf)
    .rotate() // corrige la orientacion segun EXIF...
    .resize({ width: JPEG_MAX_EDGE, height: JPEG_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY }) // ...y al re-encodear, el EXIF muere
    .toBuffer();

  return "data:image/jpeg;base64," + out.toString("base64");
}
