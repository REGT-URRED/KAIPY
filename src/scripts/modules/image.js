/* ============================================
   MODULES / image
   Captura y preparacion de fotos de usuarios.
   Comprime en el cliente (canvas) para que la
   foto quepa en localStorage (demo) y en el
   limite del backend (FASE 2: 3MB dataURL).
   GRASP: information expert.
   ============================================ */
window.KAIPY = window.KAIPY || {};

window.KAIPY.image = {
  // Lee un File y devuelve { dataUrl, width, height, sizeBytes }
  // con la foto comprimida al target del config.
  // Valida tipo, tamano y dimensiones ANTES de comprimir, y
  // vuelve a validar el resultado contra el limite del backend
  // (espejo de middleware.validPhoto) para que una foto aceptada
  // aqui nunca falle al subirse despues.
  readCompressed: function (file) {
    var cfg = window.KAIPY.config.image;
    return new Promise(function (resolve, reject) {
      // 1. Tipo: solo imagenes reales
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error("El archivo debe ser una imagen (JPG, PNG, WebP)"));
        return;
      }
      // 2. Tamano: limite de archivo crudo
      if (file.size > cfg.maxFileBytes) {
        reject(new Error("La foto pesa demasiado (max " + Math.round(cfg.maxFileBytes / 1048576) + " MB)"));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("No se pudo leer la imagen")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Archivo no es una imagen valida")); };
        img.onload = function () {
          // 3. Dimensiones: rechaza imagenes corruptas o anormalmente grandes
          if (img.width > cfg.maxDimension || img.height > cfg.maxDimension ||
              img.width < cfg.minDimension || img.height < cfg.minDimension) {
            reject(new Error("La imagen tiene dimensiones no validas"));
            return;
          }

          // 4. Re-encodear: normaliza formato y descarta metadatos
          // (EXIF con GPS). La orientacion EXIF de iOS ya la aplica
          // el navegador al decodificar, asi que el canvas sale recto.
          // Si la imagen tiene transparencia (capturas PNG), se
          // rellena de blanco antes de exportar JPEG (fondo negro si no).
          var scale = Math.min(1, cfg.targetMaxDimension / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale);
          var h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          // 5. Calidad adaptativa: baja la calidad (y de ultima el
          // tamano) hasta caber en el limite del backend. Nunca se
          // entrega una foto que el servidor vaya a rechazar.
          var quality = cfg.jpegQuality;
          var attempt = function () {
            var dataUrl = canvas.toDataURL("image/jpeg", quality);
            var sizeBytes = Math.floor(dataUrl.length * 3 / 4);
            if (sizeBytes <= cfg.maxPhotoBytes) {
              resolve({ dataUrl: dataUrl, width: w, height: h, sizeBytes: sizeBytes });
              return;
            }
            if (quality > 0.5) {
              quality -= 0.15;
              attempt();
              return;
            }
            // Reducir dimensiones a la mitad y reintentar una vez
            if (w > 320) {
              w = Math.round(w / 2);
              h = Math.round(h / 2);
              canvas.width = w;
              canvas.height = h;
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, w, h);
              ctx.drawImage(img, 0, 0, w, h);
              quality = cfg.jpegQuality;
              attempt();
              return;
            }
            reject(new Error("No se pudo comprimir la foto al limite permitido"));
          };
          attempt();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
};
