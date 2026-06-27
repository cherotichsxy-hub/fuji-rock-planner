export function toDate(iso) {
  return new Date(iso);
}

export function formatHM(iso) {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function formatRange(perf) {
  return `${formatHM(perf.startAt)}—${formatHM(perf.endAt)}`;
}

export function formatMonthDay(dateString) {
  // dateString: YYYY-MM-DD
  const [, m, d] = dateString.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function formatChineseMonthDay(dateString) {
  const [, m, d] = dateString.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

// 截短舞台名做 chip 显示："春游舞台" → "春游", "过载空间" → "过载", "GREEN STAGE" → "GREEN"
export function shortStageName(name) {
  return name
    .replace(/舞台$/, "")
    .replace(/空间$/, "")
    .replace(/\s*STAGE$/i, "")
    .replace(/\s*MARQUEE$/i, "")
    .replace(/^NAEBA SHOKUDOU$/, "苗場食堂")
    .replace(/^PALACE AREA$/, "PALACE")
    .replace(/^PYRAMID GARDEN$/, "PYRAMID")
    .trim();
}

// 时间转换为 "距离 day 起点的分钟数"，用于在 timeline 上做绝对定位
export function minutesFromDayStart(iso, dayStartHour = 12) {
  const d = new Date(iso);
  const startOfDay = new Date(d);
  startOfDay.setHours(dayStartHour, 0, 0, 0);
  // 跨过午夜的演出（如 23:30—00:30），iso 的 date 会变成第二天
  // 我们用 displayDate + dayStartHour 锚定，所以传入 perf 时要单独处理
  return Math.round((d.getTime() - startOfDay.getTime()) / 60000);
}

// 给定 displayDate 和 dayStartHour，计算 iso 时间在 timeline 上的分钟偏移
// 这能正确处理跨天的演出（startAt 在午夜后但仍属于 day 1）
export function minutesOnTimeline(iso, displayDate, dayStartHour = 12) {
  const t = new Date(iso);
  const base = new Date(`${displayDate}T00:00:00`);
  base.setHours(dayStartHour, 0, 0, 0);
  return Math.round((t.getTime() - base.getTime()) / 60000);
}

// 计算 day 的时间窗：取该日所有演出的最早开始 / 最晚结束，对齐到整点
export function computeDayWindow(performances, displayDate) {
  const dayPerfs = performances.filter((p) => p.displayDate === displayDate);
  if (dayPerfs.length === 0) {
    return { startHour: 12, endHour: 23 };
  }
  let minMin = Infinity;
  let maxMin = -Infinity;
  for (const p of dayPerfs) {
    const start = minutesOnTimeline(p.startAt, displayDate, 0);
    const end = minutesOnTimeline(p.endAt, displayDate, 0);
    if (start < minMin) minMin = start;
    if (end > maxMin) maxMin = end;
  }
  const startHour = Math.floor(minMin / 60);
  const endHour = Math.ceil(maxMin / 60);
  return { startHour, endHour };
}
