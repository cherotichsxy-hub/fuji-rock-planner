export function overlaps(a, b) {
  return new Date(a.startAt) < new Date(b.endAt) && new Date(a.endAt) > new Date(b.startAt);
}

// 返回 performance.id → 与它冲突的其他 performance 列表
// 只考虑 status 为 must / maybe 的演出（已经被用户标记进 plan 的）
export function buildConflictMap(performances, selections) {
  const marked = performances.filter((p) => selections[p.id]);
  const map = {};
  for (const a of marked) {
    map[a.id] = [];
    for (const b of marked) {
      if (a.id !== b.id && overlaps(a, b)) {
        map[a.id].push(b);
      }
    }
  }
  return map;
}
