import React, { useMemo } from "react";
import { formatHM } from "../lib/time.js";
import { getStageColor } from "../lib/stages.js";

export default function LineupList({
  festival,
  performances,
  activeDate,
  stageFilter,
  selections,
  conflictMap,
  onSetStatus,
}) {
  const visible = useMemo(() => {
    return performances
      .filter((p) => p.displayDate === activeDate)
      .filter((p) => stageFilter === "all" || p.stageName === stageFilter)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [performances, activeDate, stageFilter]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const p of visible) {
      const d = new Date(p.startAt);
      const key = `${String(d.getHours()).padStart(2, "0")}:00`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    return Array.from(map.entries());
  }, [visible]);

  if (visible.length === 0) {
    return (
      <div className="lineup-empty">
        <p className="u-mono">— NO SETS · 该筛选下无演出 —</p>
      </div>
    );
  }

  return (
    <div className="lineup-list">
      <div className="lineup-legend">
        <span><strong>★</strong> 必看</span>
        <span><strong>?</strong> 待定</span>
      </div>
      {groups.map(([hour, items]) => (
        <section key={hour} className="lineup-group">
          <div className="lineup-hour">
            <strong className="lineup-hour-time">{hour}</strong>
            <span className="lineup-hour-line" />
            <span className="u-mono lineup-hour-count">
              {String(items.length).padStart(2, "0")} SETS
            </span>
          </div>
          <ul className="lineup-cards">
            {items.map((p) => (
              <LineupCard
                key={p.id}
                perf={p}
                festival={festival}
                status={selections[p.id]}
                hasConflict={!!(conflictMap[p.id] && conflictMap[p.id].length)}
                onSetStatus={onSetStatus}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function LineupCard({ perf, festival, status, hasConflict, onSetStatus }) {
  const color = getStageColor(festival, perf.stageName);
  const bodyInner = (
    <>
      <strong className="lineup-card-name">
        {perf.artistName}
        {perf.link && <span className="lineup-card-link-mark" aria-hidden>↗</span>}
      </strong>
      <div className="lineup-card-meta u-mono">
        <span className="lineup-card-stage">
          <span className="dot" />{perf.stageName}
        </span>
        {hasConflict && (
          <span className="lineup-card-conflict">⚠ 冲突</span>
        )}
      </div>
    </>
  );
  return (
    <li
      className={`lineup-card status-${status || "none"}${hasConflict ? " has-conflict" : ""}`}
      style={{
        "--stage-solid": color.solid,
        "--stage-soft": color.soft,
        "--stage-text": color.text,
      }}
    >
      <div className="lineup-card-marker">
        <span className="lineup-card-start">{formatHM(perf.startAt)}</span>
        <span className="lineup-card-end u-mono">→ {formatHM(perf.endAt)}</span>
      </div>
      {perf.link ? (
        <a
          className="lineup-card-body lineup-card-body-link"
          href={perf.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {bodyInner}
        </a>
      ) : (
        <div className="lineup-card-body">{bodyInner}</div>
      )}
      <div className="lineup-card-actions">
        <button
          type="button"
          className={`act act-must${status === "must" ? " on" : ""}`}
          onClick={() => onSetStatus(perf.id, status === "must" ? null : "must")}
          aria-label={status === "must" ? "取消必看" : "标为必看"}
          aria-pressed={status === "must"}
        >
          ★
        </button>
        <button
          type="button"
          className={`act act-maybe${status === "maybe" ? " on" : ""}`}
          onClick={() => onSetStatus(perf.id, status === "maybe" ? null : "maybe")}
          aria-label={status === "maybe" ? "取消待定" : "标为待定"}
          aria-pressed={status === "maybe"}
        >
          ?
        </button>
      </div>
    </li>
  );
}
