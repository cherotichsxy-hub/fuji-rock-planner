import React, { useEffect, useState } from "react";
import FestivalScreen from "./screens/FestivalScreen.jsx";
import { seedFestivals, seedPerformances } from "./data/seed.js";
import {
  loadFestivals, saveFestivals,
  loadPerformances, savePerformances,
  loadSelections, saveSelections,
  loadHeadliners, saveHeadliners,
  migrateIfStale,
} from "./lib/storage.js";

// 必须在 useState 初始化之前跑，否则 loadFestivals 会读到旧数据
migrateIfStale();

const FESTIVAL_ID = "fuji-rock-2026";

export default function App() {
  const [festivals] = useState(() => loadFestivals(seedFestivals));
  const [performances] = useState(() => loadPerformances(seedPerformances));
  useEffect(() => {
    saveFestivals(festivals);
    savePerformances(performances);
  }, []); // eslint-disable-line

  const [selections, setSelections] = useState(() => loadSelections());
  const [headliners, setHeadliners] = useState(() => loadHeadliners());

  const festival = festivals.find((f) => f.id === FESTIVAL_ID);
  const festivalPerfs = performances.filter((p) => p.festivalId === FESTIVAL_ID);

  function setStatus(perfId, status) {
    setSelections((prev) => {
      const current = prev[FESTIVAL_ID] || {};
      const next = { ...current };
      if (status == null) {
        delete next[perfId];
      } else {
        next[perfId] = status;
      }
      const nextSelections = { ...prev };
      if (Object.keys(next).length === 0) {
        delete nextSelections[FESTIVAL_ID];
      } else {
        nextSelections[FESTIVAL_ID] = next;
      }
      saveSelections(nextSelections);
      return nextSelections;
    });
    // 取消 must-see → 同步移出 headliner 列表
    if (status !== "must") {
      setHeadliners((prev) => {
        const list = prev[FESTIVAL_ID] || [];
        if (!list.includes(perfId)) return prev;
        const filtered = list.filter((id) => id !== perfId);
        const nextH = { ...prev };
        if (filtered.length) nextH[FESTIVAL_ID] = filtered;
        else delete nextH[FESTIVAL_ID];
        saveHeadliners(nextH);
        return nextH;
      });
    }
  }

  function toggleHeadliner(perfId) {
    setHeadliners((prev) => {
      const list = prev[FESTIVAL_ID] || [];
      let next;
      if (list.includes(perfId)) {
        next = list.filter((id) => id !== perfId);
      } else {
        if (list.length >= 3) return prev;
        next = [...list, perfId];
      }
      const nextH = { ...prev };
      if (next.length) nextH[FESTIVAL_ID] = next;
      else delete nextH[FESTIVAL_ID];
      saveHeadliners(nextH);
      return nextH;
    });
  }

  if (!festival) return null;

  return (
    <div className="phone-frame">
      <div className="phone">
        <FestivalScreen
          festival={festival}
          performances={festivalPerfs}
          selections={selections[FESTIVAL_ID] || {}}
          headliners={headliners[FESTIVAL_ID] || []}
          onSetStatus={setStatus}
          onToggleHeadliner={toggleHeadliner}
          initialTab="lineup"
        />
      </div>
    </div>
  );
}
