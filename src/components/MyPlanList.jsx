import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toBlob } from "html-to-image";
import { formatHM, formatChineseMonthDay } from "../lib/time.js";
import { getStageColor } from "../lib/stages.js";
import ShareCanvas from "./ShareCanvas.jsx";
import ShareCanvasTimetable from "./ShareCanvasTimetable.jsx";
import TimetableView from "./TimetableView.jsx";

// headliner 色块色板（5 种 dusty 变体轮换）
const HEADLINER_COLORS = ["#8b1d1d", "#7e97a8", "#1e1506", "#b76060", "#afc0cd"];

export default function MyPlanList({
  festival,
  performances,
  activeDate,
  stageFilter,
  selections,
  headliners,
  axisChoice,
  conflictMap,
  onSetStatus,
  onToggleHeadliner,
  onPickAxis,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const paperRef = useRef(null);
  const shareCanvasRef = useRef(null);
  const [view, setView] = useState(() => {
    try { return localStorage.getItem("me:myplan_view") || "list"; } catch { return "list"; }
  });
  function switchView(v) {
    setView(v);
    try { localStorage.setItem("me:myplan_view", v); } catch {}
  }
  const [shareState, setShareState] = useState("idle"); // idle | working | preview | done | error
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [shareMode, setShareMode] = useState("list"); // list | timetable
  const [shareDayIndex, setShareDayIndex] = useState(0);
  const shareTimetableRef = useRef(null);

  async function handleShare(mode = shareMode, dayIdx = shareDayIndex) {
    setShareState("working");
    setShareError(null);
    setShareMode(mode);
    setShareDayIndex(dayIdx);
    try {
      // 等两帧让 ShareCanvasTimetable 在切换 mode/day 后 DOM 完整
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      const target =
        mode === "timetable"
          ? shareTimetableRef.current?.querySelector(".share-tt-canvas")
          : shareCanvasRef.current?.querySelector(".share-canvas");
      if (!target) throw new Error("share canvas 未就绪");
      // 等字体加载完，避免抓到无字体的画
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) {}
      }
      // iOS Safari 上 canvas 总像素超 16M 会失败；pixelRatio 取 1 最稳
      const dpr = window.devicePixelRatio || 1;
      const pixelRatio = Math.min(1.5, dpr);
      // html-to-image 用 foreignObject 序列化，复杂 SVG filter（噪点）
      // 在 foreignObject 里会渲染失败导致整张图变黑。生成前临时移除，完成后恢复。
      const prevBgImage = target.style.backgroundImage;
      target.style.backgroundImage = "none";
      const bgColor = mode === "timetable" ? "#fbf9f8" : "#d6dfde";
      let blob;
      try {
        blob = await toBlob(target, {
          backgroundColor: bgColor,
          pixelRatio,
          cacheBust: true,
        });
      } finally {
        target.style.backgroundImage = prevBgImage;
      }
      if (!blob) throw new Error("生成图片失败（返回空 blob）");
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setShareState("preview");
    } catch (err) {
      console.error("[share] failed:", err);
      const msg = err?.message || String(err) || "未知错误";
      setShareError(msg.length > 120 ? msg.slice(0, 120) + "…" : msg);
      setShareState("error");
      // error 状态不再自动消失，让用户能看到信息
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setShareState("idle");
  }

  async function confirmDownload() {
    if (!previewBlob) return;
    const filename = `im-going-to-${festival.name}-${festival.year}.png`;
    const file = new File([previewBlob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `I'm going to ${festival.name} ${festival.year}`,
        });
      } catch (e) {
        // 用户取消分享时不算错
        if (e.name !== "AbortError") console.warn("[share] aborted:", e.message);
      }
    } else {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    closePreview();
  }

  const summary = useMemo(() => {
    const allMarked = performances.filter((p) => selections[p.id]);
    const perDay = festival.dates.map((date, i) => {
      const count = performances.filter(
        (p) => p.displayDate === date && selections[p.id],
      ).length;
      return { date, dayIndex: i + 1, count };
    });
    return { total: allMarked.length, perDay };
  }, [performances, selections, festival.dates]);

  const visible = useMemo(() => {
    return performances
      .filter((p) => p.displayDate === activeDate)
      .filter((p) => selections[p.id])
      .filter((p) => stageFilter === "all" || p.stageName === stageFilter)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  }, [performances, selections, activeDate, stageFilter]);

  const dayIndex = festival.dates.indexOf(activeDate) + 1;

  // headliners: 数组 [perfId, perfId, perfId]，从 must-see 集合里取
  const headlinerList = (headliners || []).slice(0, 3);
  const mustSeePerfs = useMemo(
    () => performances
      .filter((p) => selections[p.id] === "must")
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt)),
    [performances, selections],
  );
  const headlinerPerfs = headlinerList
    .map((id) => performances.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="myplan-stage">
      {/* Headliner 槽位区 —— 在纸张外，浮在最上面 */}
      <HeadlinerRack
        festival={festival}
        slots={[0, 1, 2].map((i) => headlinerPerfs[i] || null)}
        onOpenPicker={() => setPickerOpen(true)}
        onRemove={(perfId) => onToggleHeadliner(perfId)}
      />

      <article className="myplan-paper" ref={paperRef}>
        <header className="myplan-paper-head">
          <div className="myplan-paper-marker">
            <span className="myplan-paper-tape" />
            <span className="u-mono">RUN-OF-SHOW</span>
          </div>
          <h2 className="myplan-paper-title">
            MY<br />PLAN<span className="myplan-paper-dot">.</span>
          </h2>
          <div className="myplan-paper-meta u-mono">
            <span>{formatChineseMonthDay(activeDate)} · DAY {dayIndex}</span>
            <span>SET CT · {String(visible.length).padStart(2, "0")}</span>
          </div>
        </header>

        <div className="myplan-paper-summary u-mono">
          {summary.perDay.map((s, i) => (
            <React.Fragment key={s.date}>
              {i > 0 && <span className="sep">/</span>}
              <span>D{s.dayIndex} · {String(s.count).padStart(2, "0")}</span>
            </React.Fragment>
          ))}
          <span className="sep">/</span>
          <span>TOTAL · {String(summary.total).padStart(2, "0")}</span>
        </div>

        <div className="myplan-view-switch u-mono" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            className={view === "list" ? "active" : ""}
            onClick={() => switchView("list")}
          >
            列表
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "table"}
            className={view === "table" ? "active" : ""}
            onClick={() => switchView("table")}
          >
            时间表
          </button>
        </div>

        <div className="myplan-paper-divider" />

        {visible.length === 0 ? (
          <div className="myplan-paper-empty">
            <p className="u-mono">— NO SETS QUEUED FOR THIS DAY —</p>
            <p>到「演出列表」点 <strong>★</strong> 或 <strong>?</strong> 标记演出</p>
          </div>
        ) : view === "table" ? (
          <TimetableView
            festival={festival}
            performances={performances}
            activeDate={activeDate}
            selections={selections}
            headliners={headliners}
            axisChoice={axisChoice || {}}
            conflictMap={conflictMap}
            onPickAxis={onPickAxis}
          />
        ) : (
          <ul className="myplan-rows">
            {visible.map((p) => (
              <MyPlanRow
                key={p.id}
                perf={p}
                festival={festival}
                status={selections[p.id]}
                showConflict={shouldShowConflict(p, selections[p.id], conflictMap, selections)}
                onClear={() => onSetStatus(p.id, null)}
              />
            ))}
          </ul>
        )}

        <div className="myplan-paper-foot">
          <div className="myplan-paper-divider dashed" />
          <div className="myplan-paper-stamp">
            <span className="u-mono">FP · {festival.name} · {activeDate.replace(/-/g, ".")}</span>
            <span className="u-mono myplan-paper-barcode">|||‖|‖||‖‖|||‖|‖||</span>
          </div>
        </div>
      </article>

      {visible.length > 0 && (
        <div className="myplan-share-row">
          <button
            type="button"
            className="myplan-share-btn"
            onClick={handleShare}
            disabled={shareState === "working"}
          >
            <span className="myplan-share-arrow">↗</span>
            <span>
              {shareState === "working" && "生成图片…"}
              {shareState === "done" && "已保存"}
              {shareState === "error" && "失败，重试"}
              {(shareState === "idle" || shareState === "preview") && "分享 Share"}
            </span>
          </button>
          {shareState === "error" && shareError && (
            <p className="myplan-share-error u-mono" role="alert">
              ⚠ {shareError}
            </p>
          )}
          <p className="myplan-share-hint">
            保存你的观演计划，呼朋唤友一起去看演出吧！
          </p>
        </div>
      )}

      {createPortal(
        <div className="share-canvas-mount" ref={shareCanvasRef} aria-hidden>
          <ShareCanvas
            festival={festival}
            performances={performances}
            selections={selections}
            headliners={headlinerList}
            conflictMap={conflictMap}
          />
        </div>,
        document.body,
      )}

      {createPortal(
        <div className="share-canvas-mount" ref={shareTimetableRef} aria-hidden>
          <ShareCanvasTimetable
            festival={festival}
            performances={performances}
            selections={selections}
            headliners={headlinerList}
            axisChoice={axisChoice || {}}
          />
        </div>,
        document.body,
      )}

      {(shareState === "working" || (shareState === "preview" && previewUrl)) &&
        createPortal(
          <div className="share-preview-backdrop" onClick={closePreview}>
            <div
              className="share-preview-sheet"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="share-preview-close"
                onClick={closePreview}
                aria-label="关闭"
              >
                ✕
              </button>
              <div className="share-preview-mode" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={shareMode === "list"}
                  className={shareMode === "list" ? "active" : ""}
                  onClick={() => handleShare("list")}
                  disabled={shareState === "working"}
                >
                  行程式
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shareMode === "timetable"}
                  className={shareMode === "timetable" ? "active" : ""}
                  onClick={() => handleShare("timetable")}
                  disabled={shareState === "working"}
                >
                  时间表式
                </button>
              </div>
              <div className="share-preview-img-wrap">
                {shareState === "working" ? (
                  <div className="share-preview-loading">
                    <div className="share-preview-spinner" />
                    <p className="u-mono">生成中…</p>
                  </div>
                ) : (
                  <img
                    className="share-preview-img"
                    src={previewUrl}
                    alt="分享图"
                  />
                )}
              </div>
              <div className="share-preview-actions">
                <button
                  type="button"
                  className="share-preview-cancel"
                  onClick={closePreview}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="share-preview-confirm"
                  onClick={confirmDownload}
                  disabled={shareState !== "preview"}
                >
                  ↗ 下载 / 分享
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {pickerOpen && (
        <HeadlinerPicker
          festival={festival}
          mustSeePerfs={mustSeePerfs}
          headlinerList={headlinerList}
          onPick={(perfId) => onToggleHeadliner(perfId)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ---------- Headliner Rack & Picker ---------- */

function HeadlinerRack({ festival, slots, onOpenPicker, onRemove }) {
  const filled = slots.filter(Boolean).length;
  return (
    <div className="headliner-rack">
      <div className="headliner-rack-head">
        <span className="headliner-rack-title">My Top Pick</span>
        <span className="u-mono headliner-rack-count">{filled}/3</span>
      </div>
      <div className="headliner-slots">
        {slots.map((perf, i) => {
          const color = HEADLINER_COLORS[i % HEADLINER_COLORS.length];
          if (!perf) {
            return (
              <button
                key={i}
                type="button"
                className="headliner-slot empty"
                onClick={onOpenPicker}
              >
                <span className="headliner-slot-plus">+</span>
                <small className="u-mono">SLOT {i + 1}</small>
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              className="headliner-slot filled"
              style={{ "--headliner-color": color }}
              onClick={() => onRemove(perf.id)}
              title="再点取消"
            >
              <strong className="headliner-name">{perf.artistName}</strong>
              <small className="u-mono headliner-meta">
                {perf.stageName} · {formatHM(perf.startAt)}
              </small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeadlinerPicker({ festival, mustSeePerfs, headlinerList, onPick, onClose }) {
  const remaining = 3 - headlinerList.length;
  return (
    <>
      <div className="headliner-picker-backdrop" onClick={onClose} />
      <div className="headliner-picker-sheet">
        <button
          type="button"
          className="headliner-picker-close"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>
        <div className="headliner-picker-handle" />
        <div className="headliner-picker-head">
          <h3>最想看的三组音乐人</h3>
          <small className="u-mono">
            {remaining > 0
              ? `还能挑 ${remaining} 个 · 从必看里选`
              : "已满 3 个 · 点已选项可取消"}
          </small>
        </div>
        {mustSeePerfs.length === 0 ? (
          <p className="headliner-picker-empty">先去 Lineup 标几个必看再来</p>
        ) : (
          <ul className="headliner-picker-list">
            {mustSeePerfs.map((p) => {
              const picked = headlinerList.includes(p.id);
              const disabled = !picked && remaining <= 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`headliner-picker-item${picked ? " picked" : ""}`}
                    onClick={() => onPick(p.id)}
                    disabled={disabled}
                  >
                    <span className="headliner-picker-mark">{picked ? "★" : "○"}</span>
                    <span className="headliner-picker-main">
                      <strong>{p.artistName}</strong>
                      <small className="u-mono">{p.stageName} · {formatHM(p.startAt)}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" className="headliner-picker-done" onClick={onClose}>
          完成
        </button>
      </div>
    </>
  );
}

function shouldShowConflict(perf, status, conflictMap, selections) {
  const list = conflictMap[perf.id];
  if (!list || list.length === 0) return false;
  if (status === "maybe") return true;
  return list.some((c) => selections[c.id] === "must");
}

function MyPlanRow({ perf, festival, status, showConflict, onClear }) {
  const color = getStageColor(festival, perf.stageName);
  const style = {
    "--stage-solid": color.solid,
    "--stage-soft": color.soft,
    "--stage-text": color.text,
  };

  if (status === "must") {
    return (
      <li
        className={`myplan-row must-row${showConflict ? " has-conflict" : ""}`}
        style={style}
      >
        <span className="row-marker">★</span>
        <div className="row-time">
          <strong>{formatHM(perf.startAt)}</strong>
          <small>—{formatHM(perf.endAt)}</small>
        </div>
        <div className="row-main">
          <strong className="row-name">{perf.artistName}</strong>
          <span className="row-stage">
            <span className="dot" />{perf.stageName}
          </span>
          {showConflict && (
            <span className="row-conflict">⚠ MUST × MUST 冲突</span>
          )}
        </div>
        <button
          type="button"
          className="row-remove"
          onClick={onClear}
          aria-label="取消标记"
        >
          ✕
        </button>
      </li>
    );
  }

  // 待定 行：紧凑灰行，冲突时变红
  return (
    <li
      className={`myplan-row maybe-row${showConflict ? " has-conflict" : ""}`}
      style={style}
    >
      <span className="row-marker">?</span>
      <span className="maybe-time">{formatHM(perf.startAt)}</span>
      <span className="maybe-name">{perf.artistName}</span>
      <span className="maybe-stage">
        <span className="dot" />{perf.stageName}
      </span>
      {showConflict && <span className="maybe-conflict">⚠ 撞 MUST</span>}
      <button
        type="button"
        className="row-remove"
        onClick={onClear}
        aria-label="取消标记"
      >
        ✕
      </button>
    </li>
  );
}
