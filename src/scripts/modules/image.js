/* ============================================
   MODULES / image
   Captura y preparacion de fotos.
   Comprime la imagen a max 900px (canvas) para
   que quepa en localStorage en la demo.
   ============================================ */
window.KAIPY = window.KAIPY || {};

window.KAIPY.image = {
  // Limites de la foto subida (filtro anti-abuso)
  limits: {
    maxFileBytes: 15 * 1024 * 1024,  // 15 MB de archivo crudo
    maxDimension: 10000,             // 10000 px por lado (rechaza decodificaciones raras)
    minDimension: 48                 // 48 px minimo (rechaza basura de 1x1)
  },

  // Lee un File y devuelve dataURL comprimido a max 900px.
  // Valida tipo, tamano y dimensiones ANTES de comprimir.
  readCompressed: function (file) {
    var maxSize = 900;
    var L = window.KAIPY.image.limits;
    return new Promise(function (resolve, reject) {
      // 1. Tipo: solo imagenes reales
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error("El archivo debe ser una imagen (JPG, PNG, WebP)"));
        return;
      }
      // 2. Tamano: limite de archivo crudo
      if (file.size > L.maxFileBytes) {
        reject(new Error("La foto pesa demasiado (max " + Math.round(L.maxFileBytes / 1048576) + " MB)"));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("No se pudo leer la imagen")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Archivo no es una imagen valida")); };
        img.onload = function () {
          // 3. Dimensiones: rechaza imagenes corruptas o anormalmente grandes
          if (img.width > L.maxDimension || img.height > L.maxDimension ||
              img.width < L.minDimension || img.height < L.minDimension) {
            reject(new Error("La imagen tiene dimensiones no validas"));
            return;
          }
          // Re-encodear a JPEG: normaliza el formato y descarta
          // metadatos (EXIF con GPS) que no se necesitan en la demo
          var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale);
          var h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
};
