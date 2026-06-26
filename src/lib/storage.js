// 区分两种 namespace：
//   community:*  → 模拟公共数据（任何人都能编辑发布的时间表）
//   me:*         → 个人数据（Must-see / 待定 等私人偏好）
// 真实产品里 community 应换成后端 API；me 可绑账号。

const KEYS = {
  festivals: "community:festivals",
  performances: "community:performances",
  selections: "me:selections",
  headliners: "me:headliners",
  seedVersion: "community:seed_version",
};

// 每次 seed 数据有意义改动就 bump 这个版本号，让用户浏览器里的旧缓存自动作废。
// 不会影响 me:selections（用户的个人标记）—— 只清 community 数据。
const SEED_VERSION = "2026-fuji-only-v2";

export function migrateIfStale() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(KEYS.seedVersion);
  if (stored !== SEED_VERSION) {
    localStorage.removeItem(KEYS.festivals);
    localStorage.removeItem(KEYS.performances);
    // 单音乐节版本：清理 me:selections / me:headliners 里非 Fuji Rock 的残留
    try {
      const sel = JSON.parse(localStorage.getItem(KEYS.selections) || "{}");
      const hl = JSON.parse(localStorage.getItem(KEYS.headliners) || "{}");
      const trimmedSel = sel["fuji-rock-2026"]
        ? { "fuji-rock-2026": sel["fuji-rock-2026"] }
        : {};
      const trimmedHl = hl["fuji-rock-2026"]
        ? { "fuji-rock-2026": hl["fuji-rock-2026"] }
        : {};
      localStorage.setItem(KEYS.selections, JSON.stringify(trimmedSel));
      localStorage.setItem(KEYS.headliners, JSON.stringify(trimmedHl));
    } catch (_) {}
    localStorage.setItem(KEYS.seedVersion, SEED_VERSION);
  }
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFestivals(fallback) {
  return load(KEYS.festivals, fallback);
}

export function saveFestivals(value) {
  save(KEYS.festivals, value);
}

export function loadPerformances(fallback) {
  return load(KEYS.performances, fallback);
}

export function savePerformances(value) {
  save(KEYS.performances, value);
}

export function loadSelections() {
  return load(KEYS.selections, {});
}

export function saveSelections(value) {
  save(KEYS.selections, value);
}

export function loadHeadliners() {
  return load(KEYS.headliners, {});
}

export function saveHeadliners(value) {
  save(KEYS.headliners, value);
}
