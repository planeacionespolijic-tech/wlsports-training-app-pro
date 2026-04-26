export const LEVELS = [
  { name: "Canterano", minXP: 0 },
  { name: "Debutante", minXP: 500 },
  { name: "Titular", minXP: 1000 },
  { name: "Capitán", minXP: 2000 },
  { name: "Estrella", minXP: 3500 },
  { name: "Leyenda", minXP: 5000 }
];

export const getLevelFromXP = (xp: number) => {
  return [...LEVELS].reverse().find(l => xp >= l.minXP) || LEVELS[0];
};
