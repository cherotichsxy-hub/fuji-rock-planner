import React, { useMemo } from "react";
import { formatHM } from "../lib/time.js";
import { getStageColor } from "../lib/stages.js";

/**
 * 分享专用画布：横版多日。
 * 复古海报 + 模块合成器风：
 *  - 浅米黄纸 + 颗粒纸纹
 *  - dusty 红蓝黄低饱和配色
 *  - 旋钮 / patch cable / 半圆 / 大号 outlined 数字 / 波浪线
 * 渲染在屏外，仅供 html2canvas 抓图。
 */
const HEADLINER_COLORS = ["#8b1d1d", "#7e97a8", "#1e1506", "#b76060", "#afc0cd"];

export default function ShareCanvas({
  festival,
  performances,
  selections,
  headliners = [],
  conflictMap,
}) {
  const days = useMemo(() => {
    return festival.dates.map((date, i) => ({
      date,
      dayIndex: i + 1,
      items: performances
        .filter((p) => p.displayDate === date && selections[p.id])
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    }));
  }, [festival.dates, performances, selections]);

  const totalMarks = days.reduce((s, d) => s + d.items.length, 0);
  const cols = days.length;

  // headliner 解析：id → perf 对象
  const headlinerPerfs = (headliners || [])
    .map((id) => performances.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className={`share-canvas share-canvas-cols-${cols}`}>
      {/* 半圆色块视觉锚 */}
      <span className="share-half share-half-tl" aria-hidden />
      <span className="share-half share-half-mid" aria-hidden />
      <span className="share-half share-half-bl" aria-hidden />

      {/* 音乐小元素装饰：唱片、音符、麦克风 */}
      <VinylRecord className="music-vinyl music-vinyl-1" />
      <VinylRecord className="music-vinyl music-vinyl-2" small />
      <MusicNote className="music-note music-note-1" />
      <MusicNote className="music-note music-note-2" variant="double" />
      <Microphone className="music-mic" />

      <header className="share-head">
        <div className="share-going-row">
          <Bolt />
          <h2 className="share-going">I&apos;M GOING TO</h2>
          <Bolt mirror />
        </div>

        <h1 className="share-fest-name">{festival.name}</h1>

        <div className="share-rule" />
        <div className="share-fest-meta">
          <span className="share-fest-year">{festival.year}</span>
          <span className="share-fest-sep">·</span>
          <span className="share-fest-loc">{festival.location}</span>
        </div>
      </header>

      {/* FOR · 黑胶展示架（headliners 区段）*/}
      {headlinerPerfs.length > 0 && (
        <div className="share-headliners">
          <div className="share-headliners-label u-mono">FOR</div>
          <div className="share-headliners-rack">
            {headlinerPerfs.map((perf, i) => (
              <div
                key={perf.id}
                className="share-headliner-card"
                style={{ "--headliner-color": HEADLINER_COLORS[i % HEADLINER_COLORS.length] }}
              >
                <strong className="share-headliner-name">{perf.artistName}</strong>
                <span className="share-headliner-meta u-mono">
                  {perf.stageName} · {formatHM(perf.startAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="share-grid">
        {days.map(({ date, dayIndex, items }) => (
          <ShareDay
            key={date}
            date={date}
            dayIndex={dayIndex}
            items={items}
            festival={festival}
            conflictMap={conflictMap}
            selections={selections}
          />
        ))}
      </div>

      <footer className="share-foot">
        <span className="share-foot-tag">
          {festival.name} · {String(totalMarks).padStart(2, "0")} SETS · {festival.year}
        </span>
      </footer>
    </div>
  );
}

/* ---------- 音乐元素 SVG ---------- */
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
        {/* 双音符 ♫ */}
        <path d="M 18 70 a 12 12 0 1 0 12 12 V 25 L 75 18 V 60 a 12 12 0 1 0 12 12 V 12 L 18 22 Z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden>
      {/* 单音符 ♪ */}
      <path d="M 30 75 a 14 14 0 1 0 14 14 V 22 L 80 14 L 80 25 L 44 33 V 75" fill="currentColor" />
    </svg>
  );
}

function Microphone({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 100 140" aria-hidden>
      {/* 复古球形麦：上半球 + 网格 + 手柄 */}
      <ellipse cx="50" cy="38" rx="32" ry="34" fill="currentColor" />
      {/* 网格线 */}
      <line x1="22" y1="38" x2="78" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <line x1="50" y1="6" x2="50" y2="70" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <ellipse cx="50" cy="38" rx="22" ry="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <ellipse cx="50" cy="38" rx="32" ry="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* 颈部 + 底座 */}
      <rect x="44" y="70" width="12" height="20" fill="currentColor" />
      <rect x="30" y="90" width="40" height="6" fill="currentColor" />
      <line x1="50" y1="96" x2="50" y2="135" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}


/* ---------------- 装饰组件 ---------------- */

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

/* ---------------- Day 列 ---------------- */

function ShareDay({ date, dayIndex, items, festival, conflictMap, selections }) {
  const [, m, d] = date.split("-");
  const chineseDate = `${Number(m)}月${Number(d)}日`;
  return (
    <section className="share-day">
      <div className="share-day-head">
        <span className="share-day-num">{String(dayIndex).padStart(2, "0")}</span>
        <div className="share-day-meta">
          <strong>DAY {dayIndex}</strong>
          <small>{chineseDate}</small>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="share-day-empty">— NO SETS YET —</p>
      ) : (
        <ul className="share-day-rows">
          {items.map((perf) => (
            <ShareRow
              key={perf.id}
              perf={perf}
              festival={festival}
              status={selections[perf.id]}
              conflict={shouldShowConflict(perf, selections[perf.id], conflictMap, selections)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function shouldShowConflict(perf, status, conflictMap, selections) {
  const list = conflictMap[perf.id];
  if (!list || list.length === 0) return false;
  if (status === "maybe") return true;
  return list.some((c) => selections[c.id] === "must");
}

function ShareRow({ perf, festival, status, conflict }) {
  const color = getStageColor(festival, perf.stageName);
  if (status === "must") {
    return (
      <li className={`share-row share-row-must${conflict ? " has-conflict" : ""}`}>
        <span className="share-row-marker">★</span>
        <span className="share-row-time">{formatHM(perf.startAt)}</span>
        <span className="share-row-end">→ {formatHM(perf.endAt)}</span>
        <strong className="share-row-name">{perf.artistName}</strong>
        <span
          className="share-row-stage"
          style={{ "--stage-solid": color.solid, "--stage-text": color.text }}
        >
          <span className="dot" />{perf.stageName}
        </span>
      </li>
    );
  }
  return (
    <li className={`share-row share-row-maybe${conflict ? " has-conflict" : ""}`}>
      <span className="share-row-marker">?</span>
      <span className="share-row-time">{formatHM(perf.startAt)}</span>
      <span className="share-row-name">{perf.artistName}</span>
      <span
        className="share-row-stage"
        style={{ "--stage-solid": color.solid, "--stage-text": color.text }}
      >
        <span className="dot" />{perf.stageName}
      </span>
    </li>
  );
}
