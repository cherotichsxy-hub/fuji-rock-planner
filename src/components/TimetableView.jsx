import React, { useMemo } from "react";
import { formatHM } from "../lib/time.js";
import { getStageColor } from "../lib/stages.js";

/**
 * 时间表视图 v2 · 主轴 + 备选
 *
 * 布局：
 *  - 时间轴 (左)
 *  - 主轴 (中, 占大宽度)：每个时段一个 main block，体现"我的行程主线"
 *  - 备选 (右, 占小宽度)：撞档时同时段的其他候选浮现成 bubble，可点击切换到主轴
 *
 * 撞档优先级（决定 main 是谁）：
 *  1. Headliner > 用户固定 (axisChoice) > 时间最早
 *
 * 待定永远在备选 bubble 里。
 */
const HOUR_PX = 88;
const DAY_START_HOUR = 10;

export default function TimetableView({
  festival,
  performances,
  activeDate,
  selections,
  headliners = [],
  axisChoice = {},
  conflictMap,
  onPickAxis,
}) {
  const items = useMemo(
    () =>
      performances
        .filter((p) => p.displayDate === activeDate && selections[p.id])
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    [performances, activeDate, selections],
  );

  // 切冲突组（sweep line：startAt < curEnd → 同组）
  const groups = useMemo(() => {
    const result = [];
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
        result.push(cur);
      }
    }
    return result;
  }, [items]);

  // 每组选 main + backups
  const slots = useMemo(() => {
    return groups.map((group) => {
      if (group.length === 1) return { main: group[0], backups: [] };
      // 优先级：用户点过的 > headliner > 必看里时间最早 > 时间最早
      const pinned = group.find((p) => axisChoice[p.id]);
      const headliner = group.find((p) => headliners.includes(p.id));
      const mustOnly = group.filter((p) => selections[p.id] === "must");
      const fallback = mustOnly[0] || group[0];
      const main = pinned || headliner || fallback;
      const backups = group.filter((p) => p.id !== main.id);
      return { main, backups };
    });
  }, [groups, headliners, axisChoice, selections]);

  // 时间范围
  const range = useMemo(() => {
    if (items.length === 0) return { minM: 0, maxM: 60 };
    const dayStart = new Date(`${activeDate}T${pad(DAY_START_HOUR)}:00:00`);
    let minM = Infinity;
    let maxM = -Infinity;
    for (const p of items) {
      const s = (new Date(p.startAt) - dayStart) / 60000;
      const e = (new Date(p.endAt) - dayStart) / 60000;
      if (s < minM) minM = s;
      if (e > maxM) maxM = e;
    }
    minM = Math.floor(minM / 60) * 60;
    maxM = Math.ceil(maxM / 60) * 60;
    return { minM, maxM };
  }, [items, activeDate]);

  if (items.length === 0) {
    return (
      <div className="timetable-empty">
        <p className="u-mono">— EMPTY · 还没有标记任何演出 —</p>
        <p>先去 Lineup 标几个必看 / 待定，再来这里看时间表</p>
      </div>
    );
  }

  const totalMinutes = range.maxM - range.minM;
  const totalHeight = (totalMinutes / 60) * HOUR_PX;
  const hours = [];
  for (let m = range.minM; m <= range.maxM; m += 60) hours.push(m);

  const dayStart = new Date(`${activeDate}T${pad(DAY_START_HOUR)}:00:00`);
  const hasAnyBackup = slots.some((s) => s.backups.length > 0);

  return (
    <div className="timetable-wrap">
      <div
        className="timetable-grid v2"
        style={{
          gridTemplateColumns: hasAnyBackup
            ? "60px 1fr 104px"
            : "60px 1fr",
          height: `${totalHeight}px`,
        }}
      >
        {/* 时间轴 */}
        <div className="timetable-hours" style={{ height: `${totalHeight}px` }}>
          {hours.map((m) => (
            <div
              key={m}
              className="timetable-hour-label u-mono"
              style={{ top: `${((m - range.minM) / 60) * HOUR_PX}px` }}
            >
              {formatMinuteLabel(m)}
            </div>
          ))}
        </div>

        {/* 主轴列 */}
        <div className="timetable-axis-main" style={{ height: `${totalHeight}px` }}>
          {hours.map((m) => (
            <div
              key={`gl-m-${m}`}
              className="timetable-grid-line"
              style={{ top: `${((m - range.minM) / 60) * HOUR_PX}px` }}
            />
          ))}
          {slots.map(({ main }) => {
            const color = getStageColor(festival, main.stageName);
            const startMin = (new Date(main.startAt) - dayStart) / 60000;
            const endMin = (new Date(main.endAt) - dayStart) / 60000;
            const top = ((startMin - range.minM) / 60) * HOUR_PX;
            const height = ((endMin - startMin) / 60) * HOUR_PX;
            const status = selections[main.id];
            const isHeadliner = headliners.includes(main.id);
            return (
              <article
                key={main.id}
                className={`tt-block tt-axis tt-${status}${isHeadliner ? " is-headliner" : ""}`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  "--stage-solid": color.solid,
                }}
              >
                <div className="tt-block-name">
                  {isHeadliner && <span className="tt-headliner-mark" aria-hidden>★</span>}
                  {main.artistName}
                </div>
                <div className="tt-block-stage u-mono">
                  <span className="tt-block-dot" />
                  {main.stageName}
                </div>
              </article>
            );
          })}
        </div>

        {/* 备选列 */}
        {hasAnyBackup && (
          <div className="timetable-axis-backup" style={{ height: `${totalHeight}px` }}>
            {hours.map((m) => (
              <div
                key={`gl-b-${m}`}
                className="timetable-grid-line"
                style={{ top: `${((m - range.minM) / 60) * HOUR_PX}px` }}
              />
            ))}
            {slots.map(({ main, backups }) =>
              backups.map((perf) => {
                const color = getStageColor(festival, perf.stageName);
                const startMin = (new Date(perf.startAt) - dayStart) / 60000;
                const endMin = (new Date(perf.endAt) - dayStart) / 60000;
                const top = ((startMin - range.minM) / 60) * HOUR_PX;
                const height = Math.max(
                  ((endMin - startMin) / 60) * HOUR_PX,
                  46,
                );
                const status = selections[perf.id];
                const isHeadliner = headliners.includes(perf.id);
                return (
                  <button
                    key={perf.id}
                    type="button"
                    className={`tt-bubble tt-${status}${isHeadliner ? " is-headliner" : ""}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      "--stage-solid": color.solid,
                    }}
                    onClick={() => {
                      if (onPickAxis) {
                        const siblingIds = [main, ...backups].map((p) => p.id);
                        onPickAxis(perf.id, siblingIds);
                      }
                    }}
                    aria-label={`把 ${perf.artistName} 提到主轴`}
                    title="点击 → 提到主轴"
                  >
                    <span className="tt-bubble-name">{perf.artistName}</span>
                    <span className="tt-bubble-meta u-mono">
                      {formatHM(perf.startAt)} · {shortStage(perf.stageName)}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        )}
      </div>
    </div>
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
