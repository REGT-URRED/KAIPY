/* ============================================
   MODULES / demo-data
   Reportes de ejemplo para que el feed, el mapa
   y las estadisticas no arranquen vacios. Se
   siembran solo la primera vez (storage.seed).
   Sin backend, estos datos viven en localStorage.
   ============================================ */
window.KAIPY = window.KAIPY || {};

window.KAIPY.demoData = [
  {
    id: "demo-1",
    title: "Poste de luz apagado en la cuadra",
    category: "Alumbrado publico",
    description: "El poste lleva tres noches sin encender y la calle queda a oscuras. Riesgo para los vecinos al transitar de noche.",
    lat: -13.525000,
    lon: -71.972222,
    photo: "src/assets/img/demo-1.svg",
    votes: 12,
    state: "open",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: "demo-2",
    title: "Bache grande frente al mercado",
    category: "Baches y veredas",
    description: "Bache de aproximadamente un metro de ancho que ya dano varios autos. Necesita relleno urgente.",
    lat: -13.518000,
    lon: -71.978000,
    photo: "src/assets/img/demo-2.svg",
    votes: 8,
    state: "review",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: "demo-3",
    title: "Acumulacion de basura en el parque",
    category: "Basura y residuos",
    description: "Se acumula basura desde hace una semana en la esquina del parque. Hay mal olor y roedores.",
    lat: -13.531000,
    lon: -71.965000,
    photo: "src/assets/img/demo-3.svg",
    votes: 21,
    state: "open",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: "demo-4",
    title: "Semaforo en mal estado reparado",
    category: "Senalizacion",
    description: "El semaforo de la avenida principal fue reparado esta semana. La interseccion ya es segura.",
    lat: -13.522000,
    lon: -71.981000,
    photo: "src/assets/img/demo-4.svg",
    votes: 5,
    state: "resolved",
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString()
  },
  {
    id: "demo-5",
    title: "Vereda rota frente a la escuela",
    category: "Baches y veredas",
    description: "Las losetas estan levantadas y hay riesgo de caidas, especialmente para los ninos a la salida de clases.",
    lat: -13.539000,
    lon: -71.960000,
    photo: "src/assets/img/demo-5.svg",
    votes: 15,
    state: "open",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: "demo-6",
    title: "Zona sin iluminacion en el pasaje",
    category: "Seguridad",
    description: "El pasaje completo queda a oscuras despues de las 8pm. Varios vecinos reportan asaltos en la zona.",
    lat: -13.528500,
    lon: -71.975500,
    photo: "src/assets/img/demo-6.svg",
    votes: 30,
    state: "review",
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString()
  }
];
