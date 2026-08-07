/* ============================================
   API / config
   Configuracion unica del backend demo de kaipy.
   Reglas: las categorias y estados duplican al
   frontend (src/scripts/core/config.js) porque el
   servidor SIEMPRE valida su propia entrada
   (OWASP: el cliente no confia).
   ============================================ */

export const PORT = process.env.PORT || 3000;

// Origen permitido para CORS. "*" para la demo;
// en produccion apuntar al dominio real del frontend.
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Whitelist de categorias (espejo de config.js frontend)
export const categories = [
  "Alumbrado publico",
  "Baches y veredas",
  "Basura y residuos",
  "Areas verdes",
  "Senalizacion",
  "Seguridad",
  "Agua y desague",
  "Otros"
];

// Estados validos
export const states = {
  open: "Abierto",
  review: "En revision",
  resolved: "Resuelto"
};

export const LIMITS = {
  maxTitle: 120,
  maxDescription: 1000,
  // Foto dataURL: base64 infla ~33%. 2MB de imagen => ~2.7MB de texto.
  maxPhotoBytes: 3 * 1024 * 1024,
  // Rate limit (por IP, ventana deslizante)
  createPerMinute: 10,
  votePerMinute: 30,
  windowMs: 60 * 1000
};

// Seed inicial (espejo de demo-data.js del frontend).
// Se escribe solo la primera vez que arranca el servidor.
export function seed() {
  const days = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const hours = (n) => new Date(Date.now() - n * 3600000).toISOString();
  return [
    {
      id: "demo-1",
      title: "Poste de luz apagado en la cuadra",
      category: "Alumbrado publico",
      description: "El poste lleva tres noches sin encender y la calle queda a oscuras. Riesgo para los vecinos al transitar de noche.",
      lat: -13.525,
      lon: -71.972222,
      photo: "src/assets/img/demo-1.svg",
      votes: 12,
      state: "open",
      createdAt: days(3)
    },
    {
      id: "demo-2",
      title: "Bache grande frente al mercado",
      category: "Baches y veredas",
      description: "Bache de aproximadamente un metro de ancho que ya dano varios autos. Necesita relleno urgente.",
      lat: -13.518,
      lon: -71.978,
      photo: "src/assets/img/demo-2.svg",
      votes: 8,
      state: "review",
      createdAt: days(5)
    },
    {
      id: "demo-3",
      title: "Acumulacion de basura en el parque",
      category: "Basura y residuos",
      description: "Se acumula basura desde hace una semana en la esquina del parque. Hay mal olor y roedores.",
      lat: -13.531,
      lon: -71.965,
      photo: "src/assets/img/demo-3.svg",
      votes: 21,
      state: "open",
      createdAt: days(1)
    },
    {
      id: "demo-4",
      title: "Semaforo en mal estado reparado",
      category: "Senalizacion",
      description: "El semaforo de la avenida principal fue reparado esta semana. La interseccion ya es segura.",
      lat: -13.522,
      lon: -71.981,
      photo: "src/assets/img/demo-4.svg",
      votes: 5,
      state: "resolved",
      createdAt: days(9)
    },
    {
      id: "demo-5",
      title: "Vereda rota frente a la escuela",
      category: "Baches y veredas",
      description: "Las losetas estan levantadas y hay riesgo de caidas, especialmente para los ninos a la salida de clases.",
      lat: -13.539,
      lon: -71.96,
      photo: "src/assets/img/demo-5.svg",
      votes: 15,
      state: "open",
      createdAt: days(2)
    },
    {
      id: "demo-6",
      title: "Zona sin iluminacion en el pasaje",
      category: "Seguridad",
      description: "El pasaje completo queda a oscuras despues de las 8pm. Varios vecinos reportan asaltos en la zona.",
      lat: -13.5285,
      lon: -71.9755,
      photo: "src/assets/img/demo-6.svg",
      votes: 30,
      state: "review",
      createdAt: hours(12)
    }
  ];
}
