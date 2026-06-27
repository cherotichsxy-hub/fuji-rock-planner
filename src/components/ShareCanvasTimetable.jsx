import React, { useMemo } from "react";
import { formatHM } from "../lib/time.js";
import { getStageColor } from "../lib/stages.js";

/**
 * 时间表式分享卡 v3 · 单天 + lane 算法。
 * - 无冲突时块占满整列；有冲突时自动分裂 lane
 * - 块底色用 stage 色区分；块内显示 stage 名
 * - 必看 = 实底彩色 + 白字；待定 = 纸色 + 虚框 + opacity
 * - 没有网格底纹，块对块紧贴
 */
const HOUR_PX = 90;
const DAY_START_HOUR = 10;
const LANE_WIDTH = 280;
const TIME_AXIS_WIDTH = 64;

export default function ShareCanvasTimetable({
  festival,
  performances,
  selections,
  dayIndex = 0,
}) {
  const date = festival.dates[dayIndex];
  const totalDays = festival.dates.length;

  const data = useMemo(() => {
    if (!date) return null;
    const items = performances
      .filter((p) => p.displayDate === date && selections[p.id])
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    // greedy lane 分配
    const lanes = [];
    for (const perf of items) {
      const startT = new Date(perf.startAt).getTime();
      let placed = false;
      for (const lane of lanes) {
        const last = lane[lane.length - 1];
        if (new Date(last.endAt).getTime() <= startT) {
          lane.push(perf);
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push([perf]);
    }

    // 时间范围
    let minM = Infinity;
    let maxM = -Infinity;
    const dayStart = new Date(`${date}T${pad(DAY_START_HOUR)}:00:00`);
    for (const p of items) {
      const s = (new Date(p.startAt) - dayStart) / 60000;
      const e = (new Date(p.endAt) - dayStart) / 60000;
      if (s < minM) minM = s;
      if (e > maxM) maxM = e;
    }
    if (!isFinite(minM)) {
      minM = 0;
      maxM = 60;
    } else {
      minM = Math.floor(minM / 60) * 60;
      maxM = Math.ceil(maxM / 60) * 60;
    }
    return { items, lanes, minM, maxM, dayStart };
  }, [date, performances, selections]);

  if (!data) return null;
  const { items, lanes, minM, maxM, dayStart } = data;
  const empty = items.length === 0;

  const totalMinutes = maxM - minM;
  const gridHeight = (totalMinutes / 60) * HOUR_PX;
  const hours = [];
  for (let m = minM; m <= maxM; m += 60) hours.push(m);

  const [, monStr, dayStr] = date.split("-");
  const chineseDate = `${Number(monStr)}月${Number(dayStr)}日`;
  const gridWidth =
    lanes.length === 0
      ? TIME_AXIS_WIDTH + LANE_WIDTH
      : TIME_AXIS_WIDTH + lanes.length * LANE_WIDTH;

  return (
    <div className="share-tt-canvas">
      <header className="share-tt-head">
        <div className="share-tt-going">
          <Bolt /> <span>I&apos;M GOING TO</span> <Bolt mirror />
        </div>
        <h1 className="share-tt-name">{festival.name}</h1>
        <div className="share-tt-meta u-mono">
          <strong>DAY {dayIndex + 1}</strong>
          <span className="sep">·</span>
          <span>{chineseDate}</span>
          <span className="sep">·</span>
          <span>{String(items.length).padStart(2, "0")} SETS</span>
        </div>
      </header>

      {empty ? (
        <div className="share-tt-day-empty u-mono">
          — NO SETS QUEUED FOR THIS DAY —
        </div>
      ) : (
        <div
          className="share-tt-grid"
          style={{
            width: `${gridWidth}px`,
            height: `${gridHeight}px`,
            gridTemplateColumns: `${TIME_AXIS_WIDTH}px repeat(${lanes.length}, ${LANE_WIDTH}px)`,
          }}
        >
          <div
            className="share-tt-hours"
            style={{ height: `${gridHeight}px` }}
          >
            {hours.map((m) => (
              <div
                key={m}
                className="share-tt-hour-label u-mono"
                style={{ top: `${((m - minM) / 60) * HOUR_PX}px` }}
              >
                {formatMinuteLabel(m)}
              </div>
            ))}
          </div>

          {lanes.map((lane, laneIdx) => (
            <div
              key={laneIdx}
              className="share-tt-lane"
              style={{ height: `${gridHeight}px` }}
            >
              {lane.map((perf) => {
                const color = getStageColor(festival, perf.stageName);
                const startMin = (new Date(perf.startAt) - dayStart) / 60000;
                const endMin = (new Date(perf.endAt) - dayStart) / 60000;
                const top = ((startMin - minM) / 60) * HOUR_PX;
                const height = ((endMin - startMin) / 60) * HOUR_PX;
                const status = selections[perf.id];
                return (
                  <article
                    key={perf.id}
                    className={`share-tt-block share-tt-${status}`}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      "--stage-solid": color.solid,
                    }}
                  >
                    <div className="share-tt-block-stage u-mono">
                      {perf.stageName}
                    </div>
                    <div className="share-tt-block-name">
                      {perf.artistName}
                    </div>
                    <div className="share-tt-block-time u-mono">
                      {formatHM(perf.startAt)} — {formatHM(perf.endAt)}
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <footer className="share-tt-foot u-mono">
        <span className="share-tt-foot-tag">
          {festival.name} · {festival.year} ·{" "}
          {String(dayIndex + 1).padStart(2, "0")}/
          {String(totalDays).padStart(2, "0")}
        </span>
        <span className="share-tt-foot-legend">
          <span className="legend-must" /> 必看 &nbsp;&nbsp;
          <span className="legend-maybe" /> 待定
        </span>
      </footer>
    </div>
  );
}

function Bolt({ mirror = false }) {
  return (
    <svg
      className={`share-tt-bolt${mirror ? " mirror" : ""}`}
      viewBox="0 0 24 44"
      aria-hidden
    >
      <polygon points="15,0 0,24 9,24 6,44 24,18 13,18" fill="currentColor" />
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
