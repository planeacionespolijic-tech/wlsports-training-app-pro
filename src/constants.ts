export const LEVELS = [
  { 
    name: "CANTERANO", 
    minXP: 0, 
    maxXP: 500,
    attributeCap: 30,
    focus: "Coordinación y técnica analítica",
    requirement: "Lograr 50 toques sin caer",
    estTime: "1-2 meses"
  },
  { 
    name: "PROMESAS", 
    minXP: 501, 
    maxXP: 1500,
    attributeCap: 50,
    focus: "Perfeccionamiento técnico y funcional",
    requirement: "Superar evaluación física",
    estTime: "3-5 meses"
  },
  { 
    name: "LEYENDA", 
    minXP: 1501, 
    maxXP: 4000,
    attributeCap: 75,
    focus: "Maestría técnica y alta intensidad",
    requirement: "Consolidación de habilidades",
    estTime: "6-9 meses"
  },
  { 
    name: "PROFESIONAL", 
    minXP: 4001, 
    maxXP: 999999,
    attributeCap: 100,
    focus: "Alto rendimiento y competencia",
    requirement: "Vencer al Coach en duelos y retos élite",
    estTime: "12+ meses"
  }
];

export const getLevelFromXP = (xp: number) => {
  return [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
};
