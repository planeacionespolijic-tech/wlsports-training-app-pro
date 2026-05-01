export const LEVELS = [
  { 
    name: "CANTERANO", 
    minXP: 0, 
    maxXP: 500,
    attributeCap: 30,
    focus: "Coordinación y técnica analítica",
    requirement: "Lograr 50 toques sin caer (Reto 81)",
    estTime: "1-2 meses"
  },
  { 
    name: "PROMESAS", 
    minXP: 501, 
    maxXP: 1500,
    attributeCap: 50,
    focus: "Perfeccionamiento del Método 2:1 y fuerza funcional",
    requirement: "Superar el 'Circuito Mortal' (Reto 94) en <15s",
    estTime: "3-5 meses"
  },
  { 
    name: "PROFESIONAL", 
    minXP: 1501, 
    maxXP: 4000,
    attributeCap: 75,
    focus: "Potencia explosiva y alta intensidad",
    requirement: "Vencer al Coach en 3 duelos directos de Momento 4 (M4) consecutivos",
    estTime: "6-9 meses"
  },
  { 
    name: "LEYENDA", 
    minXP: 4001, 
    maxXP: 8000,
    attributeCap: 90,
    focus: "Maestría técnica total y adaptabilidad",
    requirement: "Completar la 'Trilogía Oro' (15 cabeceos + Gol de Córner + 1min Plancha)",
    estTime: "12-18 meses"
  },
  { 
    name: "EMBAJADOR", 
    minXP: 8001, 
    maxXP: 999999,
    attributeCap: 100,
    focus: "Referente del ranking y liderazgo de retos",
    requirement: "Ganar el 'Desafío del Embajador' (Reto 95) sin usar ventajas (Buffs)",
    estTime: "24+ meses"
  }
];

export const getLevelFromXP = (xp: number) => {
  return [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
};
