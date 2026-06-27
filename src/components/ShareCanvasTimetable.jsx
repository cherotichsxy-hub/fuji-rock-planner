import React, { useMemo } from "react";

/**
 * 时间表式分享卡 v4 · 3 天合一张图。
 * 每天 = 主看 (主轴) + 必看 (备选) 双列 = 6 列总。
 * 全 3 天共享一个时间轴（从最早 startAt 到最晚 endAt）。
 * 视觉对齐 PORTOLA 海报：整点 dashed 线引导，块铺满列，无重边框。
 */
const HOUR_PX = 70;
const DAY_START_HOUR = 10;
const TIME_AXIS_WIDTH = 60;
const MAIN_COL_WIDTH = 200;
const BACKUP_COL_WIDTH = 110;

export default function ShareCanvasTimetable({
  festival,
  performances,
  selections,
  headliners = [],
  axisChoice = {},
}) {
  const dates = festival.dates;

  // 每天计算 slots（沿用 TimetableView 的 sweep-line 算法）
  const daysData = useMemo(() => {
    return dates.map((date, dayIdx) => {
      const items = performances
        .filter((p) => p.displayDate === date && selections[p.id])
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

      const groups = [];
      let cur = null;
      let curEnd = 0;
      for (const p of items) {
        const s = new Date(p.startAt).getTime();
        const e = new Date(p.endAt).getTime();
        if (cur && s < curEnd) {
          cur.push(p);
          if (e > curEnd) curEnd = e;
        } else {
          cur = [p];
          curEnd = e;
          groups.push(cur);
        }
      }

      const slots = groups.map((group) => {
        if (group.length === 1) return { main: group[0], backups: [] };
        const pinned = group.find((p) => axisChoice[p.id]);
        const headliner = group.find((p) => headliners.includes(p.id));
        const mustOnly = group.filter((p) => selections[p.id] === "must");
        const fallback = mustOnly[0] || group[0];
        const main = pinned || headliner || fallback;
        const backups = group.filter((p) => p.id !== main.id);
        return { main, backups };
      });

      return { date, dayIdx, items, slots };
    });
  }, [dates, performances, selections, headliners, axisChoice]);

  // 全 3 天共享时间范围
  const range = useMemo(() => {
    let minM = Infinity;
    let maxM = -Infinity;
    for (const d of daysData) {
      const dayStart = new Date(`${d.date}T${pad(DAY_START_HOUR)}:00:00`);
      for (const p of d.items) {
        const s = (new Date(p.startAt) - dayStart) / 60000;
        const e = (new Date(p.endAt) - dayStart) / 60000;
        if (s < minM) minM = s;
        if (e > maxM) maxM = e;
      }
    }
    if (!isFinite(minM)) {
      minM = 0;
      maxM = 60;
    } else {
      minM = Math.floor(minM / 60) * 60;
      maxM = Math.ceil(maxM / 60) * 60;
    }
    return { minM, maxM };
  }, [daysData]);

  const totalMinutes = range.maxM - range.minM;
  const gridHeight = (totalMinutes / 60) * HOUR_PX;
  const hours = [];
  for (let m = range.minM; m <= range.maxM; m += 60) hours.push(m);

  const totalSets = daysData.reduce((acc, d) => acc + d.items.length, 0);
  const totalWidth =
    TIME_AXIS_WIDTH + dates.length * (MAIN_COL_WIDTH + BACKUP_COL_WIDTH);

  return (
    <div className="share-tt-canvas share-tt-v4">
      {/* 半圆装饰（与行程式一致）*/}
      <span className="share-half share-half-tl" aria-hidden />
      <span className="share-half share-half-mid" aria-hidden />
      <span className="share-half share-half-bl" aria-hidden />

      {/* 音乐元素装饰 */}
      <VinylRecord className="music-vinyl music-vinyl-1" />
      <VinylRecord className="music-vinyl music-vinyl-2" small />
      <MusicNote className="music-note music-note-1" />
      <MusicNote className="music-note music-note-2" variant="double" />
      <Microphone className="music-mic" />

      <header className="share-head share-tt-head">
        <div className="share-going-row">
          <Bolt />
          <h2 className="share-going">I&apos;M GOING TO</h2>
          <Bolt mirror />
        </div>
        <h1 className="share-fest-name">{festival.name}</h1>
        <div className="share-fest-meta share-tt-meta u-mono">
          <span>{festival.year}</span>
          <span className="share-fest-sep">·</span>
          <span>{festival.location}</span>
          <span className="share-fest-sep">·</span>
          <span>{String(totalSets).padStart(2, "0")} SETS</span>
        </div>
      </header>

      {totalSets === 0 ? (
        <div className="share-tt-day-empty u-mono">
          — NO SETS QUEUED —
        </div>
      ) : (
        <>
          {/* 列头：DAY 1 / 2 / 3 */}
          <div
            className="share-tt-day-heads"
            style={{
              gridTemplateColumns: `${TIME_AXIS_WIDTH}px ${dates
                .map(() => `${MAIN_COL_WIDTH}px ${BACKUP_COL_WIDTH}px`)
                .join(" ")}`,
            }}
          >
            <div />
            {daysData.map((d) => (
              <React.Fragment key={d.date}>
                <div className="share-tt-day-head main-side">
                  <strong>DAY {d.dayIdx + 1}</strong>
                  <span className="share-tt-day-date">{chineseDateOf(d.date)}</span>
                </div>
                <div className="share-tt-day-head backup-side u-mono">
                  必看
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* 子列头：主看 */}
          <div
            className="share-tt-sub-heads u-mono"
            style={{
              gridTemplateColumns: `${TIME_AXIS_WIDTH}px ${dates
                .map(() => `${MAIN_COL_WIDTH}px ${BACKUP_COL_WIDTH}px`)
                .join(" ")}`,
            }}
          >
            <div />
            {daysData.map((d) => (
              <React.Fragment key={d.date}>
                <div className="share-tt-sub-head">主看</div>
                <div />
              </React.Fragment>
            ))}
          </div>

          {/* 时间表本体 */}
          <div
            className="share-tt-grid"
            style={{
              width: `${totalWidth}px`,
              height: `${gridHeight}px`,
              gridTemplateColumns: `${TIME_AXIS_WIDTH}px ${dates
                .map(() => `${MAIN_COL_WIDTH}px ${BACKUP_COL_WIDTH}px`)
                .join(" ")}`,
            }}
          >
            {/* 时间轴 */}
            <div className="share-tt-hours" style={{ height: `${gridHeight}px` }}>
              {hours.map((m) => (
                <div
                  key={m}
                  className="share-tt-hour-label u-mono"
                  style={{ top: `${((m - range.minM) / 60) * HOUR_PX}px` }}
                >
                  {formatMinuteLabel(m)}
                </div>
              ))}
            </div>

            {daysData.map((d) => {
              const dayStart = new Date(
                `${d.date}T${pad(DAY_START_HOUR)}:00:00`,
              );
              return (
                <React.Fragment key={d.date}>
                  {/* 主看列 */}
                  <div
                    className="share-tt-axis-main"
                    style={{ height: `${gridHeight}px` }}
                  >
                    {hours.map((m) => (
                      <div
                        key={m}
                        className="share-tt-grid-line"
                        style={{ top: `${((m - range.minM) / 60) * HOUR_PX}px` }}
                      />
                    ))}
                    {d.slots.map(({ main }) => {
                      const sm = (new Date(main.startAt) - dayStart) / 60000;
                      const em = (new Date(main.endAt) - dayStart) / 60000;
                      const top = ((sm - range.minM) / 60) * HOUR_PX;
                      const height = ((em - sm) / 60) * HOUR_PX;
                      const isH = headliners.includes(main.id);
                      const status = selections[main.id];
                      return (
                        <article
                          key={main.id}
                          className={`share-tt-block share-tt-${status}${isH ? " is-h" : ""}`}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                          }}
                        >
                          <div className="share-tt-block-name">
                            {isH && <span className="share-tt-h-mark">★</span>}
                            {main.artistName}
                          </div>
                          <div className="share-tt-block-stage u-mono">
                            {shortStage(main.stageName)}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {/* 必看（备选）列 */}
                  <div
                    className="share-tt-axis-backup"
                    style={{ height: `${gridHeight}px` }}
                  >
                    {hours.map((m) => (
                      <div
                        key={m}
                        className="share-tt-grid-line"
                        style={{ top: `${((m - range.minM) / 60) * HOUR_PX}px` }}
                      />
                    ))}
                    {d.slots.map(({ backups }) =>
                      backups.map((perf) => {
                        const sm = (new Date(perf.startAt) - dayStart) / 60000;
                        const em = (new Date(perf.endAt) - dayStart) / 60000;
                        const top = ((sm - range.minM) / 60) * HOUR_PX;
                        const height = ((em - sm) / 60) * HOUR_PX;
                        const status = selections[perf.id];
                        const isH = headliners.includes(perf.id);
                        return (
                          <article
                            key={perf.id}
                            className={`share-tt-bubble share-tt-${status}${isH ? " is-h" : ""}`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                          >
                            <div className="share-tt-bubble-name">
                              {isH && <span className="share-tt-h-mark">★</span>}
                              {perf.artistName}
                            </div>
                          </article>
                        );
                      }),
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </>
      )}

      <footer className="share-tt-foot u-mono">
        <span className="share-tt-foot-tag">
          {festival.name} · {festival.year}
        </span>
        <span className="share-tt-foot-legend">
          <span className="legend-h" />★ 最想看
          <span className="legend-must" /> 必看
          <span className="legend-maybe" /> 待定
        </span>
      </footer>
    </div>
  );
}

function Bolt({ mirror = false }) {
  return (
    <svg
      className={`share-bolt${mirror ? " mirror" : ""}`}
      viewBox="0 0 24 44"
      aria-hidden
    >
      <polygon points="15,0 0,24 9,24 6,44 24,18 13,18" fill="currentColor" />
    </svg>
  );
}

function VinylRecord({ className = "", small = false }) {
  const r = small ? 50 : 80;
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden>
      <circle cx="100" cy="100" r={r} fill="currentColor" />
      <circle cx="100" cy="100" r={r * 0.7} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <circle cx="100" cy="100" r={r * 0.55} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <circle cx="100" cy="100" r={r * 0.4} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
      <circle cx="100" cy="100" r={r * 0.28} fill="#d83a32" />
      <circle cx="100" cy="100" r={r * 0.06} fill="currentColor" />
    </svg>
  );
}

function MusicNote({ className = "", variant = "single" }) {
  if (variant === "double") {
    return (
      <svg className={className} viewBox="0 0 100 100" aria-hidden>
        <path d="M 18 70 a 12 12 0 1 0 12 12 V 25 L 75 18 V 60 a 12 12 0 1 0 12 12 V 12 L 18 22 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      <path d="M 30 75 a 14 14 0 1 0 14 14 V 22 L 80 14 L 80 25 L 44 33 V 75" fill="currentColor" />
    </svg>
  );
}

function Microphone({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 100 140" aria-hidden>
      <ellipse cx="50" cy="38" rx="32" ry="34" fill="currentColor" />
      <line x1="22" y1="38" x2="78" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <line x1="50" y1="6" x2="50" y2="70" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <ellipse cx="50" cy="38" rx="22" ry="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <ellipse cx="50" cy="38" rx="32" ry="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="44" y="70" width="12" height="20" fill="currentColor" />
      <rect x="30" y="90" width="40" height="6" fill="currentColor" />
      <line x1="50" y1="96" x2="50" y2="135" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatMinuteLabel(m) {
  const totalMin = DAY_START_HOUR * 60 + m;
  const h = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${pad(h)}:${pad(mm)}`;
}

function chineseDateOf(date) {
  const [, mo, d] = date.split("-");
  return `${Number(mo)}月${Number(d)}日`;
}

function shortStage(s) {
  return s
    .replace(/\s*STAGE$/, "")
    .replace(/\s*MARQUEE$/, "")
    .replace(/^FIELD OF HEAVEN$/, "FOH")
    .replace(/^NAEBA SHOKUDOU$/, "苗場")
    .replace(/^GYPSY AVALON$/, "AVALON")
    .replace(/^CRYSTAL PALACE$/, "CRYSTAL")
    .replace(/^ROOKIE A GO-GO$/, "ROOKIE")
    .replace(/^PYRAMID GARDEN$/, "PYRAMID")
    .replace(/^PALACE AREA$/, "PALACE");
}
