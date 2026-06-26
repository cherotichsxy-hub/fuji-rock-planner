// 每个 festival 的舞台颜色按位置分配。
// 调色板取自复古海报家族 —— 全部 dusty/低饱和，与主视觉 4 色（crimson / dusty blue / warm black / cream）和谐。

const PALETTE = [
  { name: "crimson",  solid: "#8b1d1d", soft: "#ead2d2", text: "#5a1414" },
  { name: "blue",     solid: "#7e97a8", soft: "#dde5ea", text: "#3f5667" },
  { name: "sage",     solid: "#7a8a72", soft: "#e1e6dc", text: "#465241" },
  { name: "mustard",  solid: "#a08542", soft: "#ece2c4", text: "#5c4925" },
  { name: "rust",     solid: "#9b5933", soft: "#ecd9cb", text: "#5e3219" },
  { name: "slate",    solid: "#6a7a8a", soft: "#d8dde2", text: "#3a4452" },
  { name: "wine",     solid: "#6a2a2a", soft: "#dec8c8", text: "#4a1717" },
  { name: "olive",    solid: "#5e6a4e", soft: "#dde2d2", text: "#363f2c" },
];

export function getStageColor(festival, stageName) {
  const idx = festival.stages.indexOf(stageName);
  if (idx === -1) return PALETTE[0];
  return PALETTE[idx % PALETTE.length];
}
