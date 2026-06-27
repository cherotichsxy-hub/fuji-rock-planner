import React, { useMemo, useState } from "react";
import LineupList from "../components/LineupList.jsx";
import MyPlanList from "../components/MyPlanList.jsx";
import { buildConflictMap } from "../lib/conflicts.js";
import { formatMonthDay, shortStageName } from "../lib/time.js";
import { getStageColor } from "../lib/stages.js";

export default function FestivalScreen({
  festival,
  performances,
  selections,
  headliners,
  onSetStatus,
  onToggleHeadliner,
  onBack,
  initialTab = "lineup",
}) {
  const [activeDate, setActiveDate] = useState(festival.dates[0]);
  const [tab, setTab] = useState(initialTab);
  const [stageFilter, setStageFilter] = useState("all");
  const [showOtherStages, setShowOtherStages] = useState(false);
  const mainCount = festival.mainStageCount || festival.stages.length;
  const mainStages = festival.stages.slice(0, mainCount);
  const otherStages = festival.stages.slice(mainCount);

  const festivalSelections = selections || {};
  const conflictMap = useMemo(
    () => buildConflictMap(performances, festivalSelections),
    [performances, festivalSelections],
  );

  const markedCount = useMemo(
    () => performances.filter((p) => festivalSelections[p.id]).length,
    [performances, festivalSelections],
  );

  const dayIndex = festival.dates.indexOf(activeDate) + 1;

  return (
    <>
      <header className="fest-header">
        <div className="fest-header-top">
          {onBack && (
            <button className="back-btn" onClick={onBack} aria-label="返回">‹</button>
          )}
          <span className="u-mono fest-header-channel">
            FREQ · {festival.year} · DAY {dayIndex}
          </span>
          <div className="date-pills">
            {festival.dates.map((d) => (
              <button
                key={d}
                type="button"
                className={activeDate === d ? "active" : ""}
                onClick={() => setActiveDate(d)}
              >
                {formatMonthDay(d)}
              </button>
            ))}
          </div>
        </div>
        <h1 className="fest-header-name">{festival.name}</h1>
        <div className="fest-header-rule" />
        <p className="u-mono fest-header-loc">
          <span>LOC</span> · {festival.location}
        </p>
      </header>

      <div className="stage-chips-bar">
        <span className="u-mono stage-chips-label">STAGE</span>
        <div className="stage-chips">
          <button
            type="button"
            className={`chip${stageFilter === "all" ? " active" : ""}`}
            onClick={() => setStageFilter("all")}
          >
            ALL
          </button>
          {mainStages.map((stage) => {
            const color = getStageColor(festival, stage);
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                className={`chip${active ? " active" : ""}`}
                style={{
                  "--chip-color": color.solid,
                  "--chip-soft": color.soft,
                }}
                onClick={() => setStageFilter(stage)}
              >
                {shortStageName(stage)}
              </button>
            );
          })}
          {showOtherStages && otherStages.map((stage) => {
            const color = getStageColor(festival, stage);
            const active = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                className={`chip chip-other${active ? " active" : ""}`}
                style={{
                  "--chip-color": color.solid,
                  "--chip-soft": color.soft,
                }}
                onClick={() => setStageFilter(stage)}
              >
                {shortStageName(stage)}
              </button>
            );
          })}
          {otherStages.length > 0 && (
            <button
              type="button"
              className="chip chip-more"
              onClick={() => setShowOtherStages((v) => !v)}
              aria-expanded={showOtherStages}
            >
              {showOtherStages ? "收起 −" : `更多 +${otherStages.length}`}
            </button>
          )}
        </div>
      </div>

      <main className="fest-body">
        {tab === "lineup" && (
          <LineupList
            festival={festival}
            performances={performances}
            activeDate={activeDate}
            stageFilter={stageFilter}
            selections={festivalSelections}
            conflictMap={conflictMap}
            onSetStatus={onSetStatus}
          />
        )}
        {tab === "plan" && (
          <MyPlanList
            festival={festival}
            performances={performances}
            activeDate={activeDate}
            stageFilter={stageFilter}
            selections={festivalSelections}
            headliners={headliners}
            conflictMap={conflictMap}
            onSetStatus={onSetStatus}
            onToggleHeadliner={onToggleHeadliner}
          />
        )}
      </main>

      <nav className="fest-bottom-nav">
        <button
          type="button"
          className={tab === "lineup" ? "active" : ""}
          onClick={() => setTab("lineup")}
        >
          <span className="nav-glyph">♬</span>
          <span className="u-mono nav-label">LINEUP</span>
        </button>
        <button
          type="button"
          className={tab === "plan" ? "active" : ""}
          onClick={() => setTab("plan")}
        >
          <span className="nav-glyph">★</span>
          <span className="u-mono nav-label">MY PLAN</span>
          {markedCount > 0 && <span className="nav-badge">{markedCount}</span>}
        </button>
      </nav>
    </>
  );
}
