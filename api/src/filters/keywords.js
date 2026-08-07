/* ============================================
   API / filters / keywords
   Bloqueo por texto: terminos de contenido
   explicito/ilegal en titulo y descripcion.
   Coincidencia sin acentos y en minusculas.
   Complementa al clasificador NSFW de imagenes:
   aca se frena el spam de titulos "porno xxx"
   sin gastar inferencia ML.
   ============================================ */

// Lista de terminos (es). Se agregan a mano cuando
// aparezcan variantes reales; el filtro ML de la foto
// no depende de esta lista.
const TERMS = [
  "porno",
  "pornografia",
  "pornografic",
  "hentai",
  "onlyfans",
  "sexcam",
  "pedofil",
  "pederast"
];

function normalize(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Devuelve el termino que coincidio, o null si el texto es limpio.
export function matchBlockedTerm(...parts) {
  const text = normalize(parts.join(" "));
  for (const term of TERMS) {
    if (text.indexOf(term) !== -1) { return term; }
  }
  return null;
}
