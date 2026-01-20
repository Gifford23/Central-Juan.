// TimeShiftView.jsx
import React, { useState, useMemo, useEffect } from "react";
import { useShiftsData } from "../schedule-manager-hooks/ShiftAPIhooks"; // adjust path
import WorkTimeFormModal from "../../work-time/work-time-componets/WorkTimeFormModal"; // adjust path

function parseTimeToMinutes(t) {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  return parts[0] * 60 + parts[1] + (parts[2] ? parts[2] / 60 : 0);
}
function minutesToHHMM(min) {
  const m = Math.floor(min % 60).toString().padStart(2, "0");
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// default range: 00:00 - 24:00
export default function TimeShiftView({ initialRange = { start: 0, end: 24 * 60 } }) {
  const { workTimes, breaksByWork, lateRulesByWork, loading, error, fetch } = useShiftsData();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [range, setRange] = useState(initialRange);

  // Detect sizes: mobile and tiny mobile
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width:720px)").matches : false
  );
  const [isTiny, setIsTiny] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width:420px)").matches : false
  );
  const [isVeryTiny, setIsVeryTiny] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width:360px)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqMobile = window.matchMedia("(max-width:720px)");
    const mqTiny = window.matchMedia("(max-width:420px)");
    const mqVeryTiny = window.matchMedia("(max-width:360px)");
    const h1 = (e) => setIsMobile(e.matches);
    const h2 = (e) => setIsTiny(e.matches);
    const h3 = (e) => setIsVeryTiny(e.matches);
    if (mqMobile.addEventListener) {
      mqMobile.addEventListener("change", h1);
      mqTiny.addEventListener("change", h2);
      mqVeryTiny.addEventListener("change", h3);
    } else {
      mqMobile.addListener(h1);
      mqTiny.addListener(h2);
      mqVeryTiny.addListener(h3);
    }
    return () => {
      if (mqMobile.removeEventListener) {
        mqMobile.removeEventListener("change", h1);
        mqTiny.removeEventListener("change", h2);
        mqVeryTiny.removeEventListener("change", h3);
      } else {
        mqMobile.removeListener(h1);
        mqTiny.removeListener(h2);
        mqVeryTiny.removeListener(h3);
      }
    };
  }, []);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);

  const shifts = workTimes || [];

  useEffect(() => {
    if (shifts.length && (selectedIndex == null || selectedIndex > shifts.length - 1)) {
      setSelectedIndex(0);
    }
  }, [shifts, selectedIndex]);

  const selectedShift = shifts[selectedIndex] || null;
  const breaksForSelected = selectedShift ? (breaksByWork[String(selectedShift.id)] || []) : [];
  const lateAssignments = selectedShift ? (lateRulesByWork[String(selectedShift.id)] || []) : [];

  // percent converter
  const rangeSpan = Math.max(1, (range.end - range.start));
  const toPercent = (mins) => {
    const p = ((mins - range.start) / rangeSpan) * 100;
    if (!Number.isFinite(p)) return 0;
    return p;
  };

  // blocks (split at is_shift_split)
  const blocks = useMemo(() => {
    if (!selectedShift) return [];
    const shiftStart = parseTimeToMinutes(selectedShift.start_time);
    const shiftEnd = parseTimeToMinutes(selectedShift.end_time);

    const splits = (breaksForSelected || [])
      .filter((b) => Number(b.is_shift_split) === 1)
      .map((b) => ({ ...b, startM: parseTimeToMinutes(b.break_start), endM: parseTimeToMinutes(b.break_end) }))
      .sort((a, b) => a.startM - b.startM);

    if (!splits.length) return [{ index: 1, start: shiftStart, end: shiftEnd, splitBreak: null }];

    const boundaries = [];
    boundaries.push({ s: shiftStart, e: splits[0].startM, splitBreak: null });
    for (let i = 0; i < splits.length - 1; i++) {
      boundaries.push({ s: splits[i].endM, e: splits[i + 1].startM, splitBreak: splits[i] });
    }
    boundaries.push({ s: splits[splits.length - 1].endM, e: shiftEnd, splitBreak: splits[splits.length - 1] });

    return boundaries.map((b, i) => ({ index: i + 1, start: b.s, end: b.e, splitBreak: b.splitBreak })).filter((b) => b.end > b.start);
  }, [selectedShift, breaksForSelected]);

  // render blocks
  const breakRenderBlocks = useMemo(() => {
    return (breaksForSelected || []).map((b) => {
      const bs = parseTimeToMinutes(b.break_start),
        be = parseTimeToMinutes(b.break_end);
      return { id: b.id, left: toPercent(bs), width: Math.max(0.5, toPercent(be) - toPercent(bs)), title: `${b.break_name} (${b.break_start}-${b.break_end})`, raw: b };
    });
  }, [breaksForSelected, range]);

  const lateRenderBlocks = useMemo(() => {
    if (!selectedShift) return [];
    const shiftStart = parseTimeToMinutes(selectedShift.start_time);
    const shiftEnd = parseTimeToMinutes(selectedShift.end_time);
    const shiftValidInEnd = parseTimeToMinutes(selectedShift.valid_in_end || selectedShift.start_time);

    const out = [];
    for (const assignment of lateAssignments || []) {
      const r = assignment.rule;
      const blkIdx = assignment.block_index;
      if (blkIdx === null) {
        const s = shiftValidInEnd + Number(r.min_minutes || 0);
        const e = r.max_minutes ? shiftValidInEnd + Number(r.max_minutes) : shiftEnd;
        out.push({ id: `late-whole-${r.id}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Late (whole): ${r.min_minutes}-${r.max_minutes ?? "∞"}` });
      } else {
        const block = blocks.find((b) => Number(b.index) === Number(blkIdx));
        if (!block) {
          const s = shiftValidInEnd + Number(r.min_minutes || 0);
          const e = r.max_minutes ? shiftValidInEnd + Number(r.max_minutes) : shiftEnd;
          out.push({ id: `late-fallback-${r.id}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Late (fallback): ${r.min_minutes}-${r.max_minutes ?? "∞"}` });
          continue;
        }
        let anchorM = block.start;
        if (block.splitBreak && block.splitBreak.endM) {
          anchorM = block.splitBreak.endM;
        } else {
          if (Number(block.index) === 1) anchorM = shiftValidInEnd || block.start;
          else anchorM = block.start;
        }
        const s = anchorM + Number(r.min_minutes || 0);
        const e = r.max_minutes ? anchorM + Number(r.max_minutes) : block.end;
        out.push({ id: `late-block-${r.id}-${blkIdx}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Late (block ${blkIdx}): ${r.min_minutes}-${r.max_minutes ?? "∞"}` });
      }
    }

    const splitBreaks = blocks.map((b) => ({ block: b, split: b.splitBreak })).filter((x) => x.split);
    for (const sb of splitBreaks) {
      const blockIndex = sb.block.index;
      const hasRuleForBlock = out.some((o) => o.id.includes(`-block-`) && o.id.endsWith(`-${blockIndex}`));
      if (!hasRuleForBlock) {
        const anchor = sb.split.endM || sb.block.start;
        const autoMinutes = 10;
        const s = anchor + 0;
        const e = s + autoMinutes;
        out.push({ id: `late-auto-${sb.split.id}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Auto late (no rule)` });
      }
    }

    return out;
  }, [selectedShift, lateAssignments, blocks, range]);

  const workBlocksToRender = useMemo(() => {
    return blocks.map((b) => ({ id: `work-${b.index}`, left: toPercent(b.start), width: Math.max(0.5, toPercent(b.end) - toPercent(b.start)), title: `Block ${b.index}: ${minutesToHHMM(b.start)} - ${minutesToHHMM(b.end)}` }));
  }, [blocks, range]);

  const clampBlock = (block) => {
    const left = Math.max(0, Math.min(100, block.left));
    const right = Math.max(0, Math.min(100, block.left + block.width));
    return { ...block, left, width: Math.max(0.5, right - left) };
  };

  // Modal handlers
  const openAddModal = () => {
    setModalInitial(null);
    setModalOpen(true);
  };
  const openEditModal = (shift) => {
    setModalInitial({
      ...shift,
      is_default: Number(shift.is_default) === 1 ? 1 : 0
    });
    setModalOpen(true);
  };
  const handleModalSaved = () => {
    fetch();
  };

  if (loading) return <div className="tsv-root"><div className="tsv-loading">Loading shifts…</div></div>;
  if (error) return <div className="tsv-root"><div className="tsv-error">Error: {error}</div></div>;

  // ticks: for very tiny screens, only show start & end
  const tickLabels = isVeryTiny
    ? [range.start, range.end]
    : isTiny
    ? Array.from({ length: Math.floor((range.end - range.start) / 180) + 1 }, (_, i) => range.start + i * 180)
    : Array.from({ length: Math.floor((range.end - range.start) / 60) + 1 }, (_, i) => range.start + i * 60);

  return (
    <div className="tsv-root" style={{ maxWidth: 1120, margin: "0 auto", padding: isTiny ? 8 : 12 }}>
      <style>{`
        :root {
          --bg: #f6fbfb;
          --card: #ffffff;
          --muted: #6b7280;
          --accent: #06b6d4;
          --accent-2: #10b981;
          --late: #ef4444;
          --break: #34d399;
          --work: #93e6ff;
          --shadow: 0 6px 18px rgba(2,6,23,0.08);
          --radius: 12px;
        }
        .tsv-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .tsv-title { font-size:20px; font-weight:700; color:#0f172a; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tsv-addbtn {
          background: linear-gradient(135deg,var(--accent-2),#17a2a2);
          color: white; border: none; padding:10px 14px; border-radius:12px;
          box-shadow: var(--shadow); cursor:pointer; font-weight:600;
        }

        /* pills */
        .tsv-pills { display:flex; gap:10px; flex-wrap:nowrap; overflow-x:auto; padding-bottom:6px; margin-bottom:14px; -webkit-overflow-scrolling:touch; }
        .tsv-pill {
          background: linear-gradient(180deg,#e6f9ff,#d7f3ff); border:none; padding:10px 14px; border-radius:999px;
          min-width:120px; white-space:nowrap; display:inline-flex; gap:8px; align-items:center; font-weight:600; cursor:pointer; color:#063241;
          box-shadow: 0 4px 12px rgba(2,6,23,0.06);
        }
        .tsv-pill.active { background: linear-gradient(180deg,#008ecb,#0078b8); color: #fff; transform:scale(1.02) }
        .tsv-pill .edit { margin-left:8px; background:white; padding:4px; border-radius:6px; font-size:12px; cursor:pointer; box-shadow:0 2px 6px rgba(2,6,23,0.06) }

        .tsv-controls { display:flex; gap:10px; align-items:center; margin-bottom:12px; flex-wrap:wrap }
        .tsv-rangebtn { background: transparent; border:1px solid #e6eef0; padding:8px 12px; border-radius:10px; cursor:pointer; color:#074c59 }

        .tsv-card { background: var(--card); border-radius:16px; padding:18px; box-shadow: var(--shadow); }
        .tsv-legend { display:flex; gap:16px; align-items:center; margin-bottom:12px; color:var(--muted); font-size:14px }
        .tsv-swatch { width:28px; height:18px; border-radius:6px; box-shadow:inset 0 -2px rgba(0,0,0,0.04) }

        .tsv-timeline-viewport { position:relative; height:64px; background:#f1f5f9; border-radius:10px; overflow:hidden; margin-bottom:8px }
        .tsv-timeline-track { position:absolute; inset:0; padding:8px 18px; box-sizing:border-box; }
        .tsv-rail { position:absolute; left:18px; right:18px; top:18px; height:28px; background:#fff; border-radius:8px; box-shadow: 0 2px 8px rgba(2,6,23,0.04); }
        .tsv-block { position:absolute; top:18px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; color:#042436; transition: transform .12s ease, opacity .12s ease; }
        .tsv-block.work { background: var(--work); }
        .tsv-block.break { background: var(--break); color: #043; }
        .tsv-block.late { background: var(--late); color: #fff; font-weight:600; }
        .tsv-block:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(2,6,23,0.08) }
        .tsv-ticks { display:flex; gap:4px; justify-content:space-between; padding:0 18px; font-size:13px; color:#263238; margin-top:8px; }

        /* MOBILE HEADER: use GRID so select and edit button do not overlap.
           Grid columns: 1fr auto. On very small screens the grid stacks to a single column */
        .tsv-mobile-header { display: grid; grid-template-columns: 1fr auto; gap:8px; align-items:center; width:100%; margin-bottom:10px; }
        .tsv-mobile-select { flex:1; padding:8px 10px; border-radius:10px; border:1px solid #e6eef0; background:white; font-weight:600; min-width:0; box-sizing:border-box; }
        /* ensure the edit button in mobile header keeps its normal appearance but can shrink */
        .tsv-mobile-header .tsv-rangebtn { white-space:nowrap; padding:8px 10px; }

        .tsv-legend .label { margin-left:6px; }

        @media (max-width:720px) {
          .tsv-title { font-size:16px }
          .tsv-pills { gap:8px }
          .tsv-rail { top:12px; height:22px }
          .tsv-block, .tsv-timeline-viewport { height:52px }
          .tsv-ticks { font-size:12px; padding:0 12px }
          .tsv-pills { display:none; }
          .tsv-mobile-select { display:block; }
          .tsv-legend { gap:8px; font-size:12px }
          .tsv-legend .label { display:none } /* keep swatch visible, hide text to reduce height */
          .tsv-pill { min-width:90px; padding:8px 10px }
          .tsv-card { padding:12px; border-radius:12px }
        }

        /* tiny screens: stack mobile header to single column so Edit sits under the select (full width) */
        @media (max-width:420px) {
          .tsv-header { flex-direction:column; align-items:stretch; gap:8px; }
          .tsv-addbtn { width:100%; padding:10px; border-radius:10px; font-size:14px; }
          .tsv-controls { flex-direction:column; align-items:stretch; gap:8px; }
          .tsv-rangebtn { width:100%; text-align:center; }
          .tsv-mobile-header { grid-template-columns: 1fr; } /* stack: select then edit button */
          .tsv-mobile-select { font-size:13px; padding:7px 8px; }
          .tsv-timeline-track { padding:6px 12px; }
          .tsv-rail { left:12px; right:12px; top:12px; height:20px; }
          .tsv-ticks { padding:0 12px; font-size:11px; }
        }

        /* very tiny screens */
        @media (max-width:360px) {
          .tsv-title { font-size:14px }
          .tsv-rail { left:10px; right:10px; }
          .tsv-timeline-viewport { height:46px; }
          .tsv-block { top:10px; height:28px; }
        }

        /* desktop: hide mobile select element (we still keep it in DOM) */
        @media (min-width:721px) {
          .tsv-mobile-select { display:none; }
        }
      `}</style>

      {/* header */}
      <div className="tsv-header" aria-hidden={false}>
        <div className="tsv-title">Time Shift View</div>
        <button
          className="tsv-addbtn"
          onClick={openAddModal}
          aria-label="Add shift"
          title="+ Add Shift"
        >
          + Add Shift
        </button>
      </div>

      {/* mobile select (uses CSS grid to prevent overlap) */}
      <div className="tsv-mobile-header" role="tablist" aria-label="Shifts (mobile)">
        <select
          className="tsv-mobile-select"
          aria-label="Select shift"
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
        >
          {shifts.map((s, idx) => (
            <option key={s.id} value={idx}>
              {s.shift_name} ({s.start_time}-{s.end_time})
            </option>
          ))}
        </select>

        {/* Edit button is now guaranteed to sit to the right on normal mobile and stack under select on tiny screens */}
        <button
          className="tsv-rangebtn"
          onClick={() => selectedShift && openEditModal(selectedShift)}
          aria-label="Edit selected shift"
          title="Edit selected shift"
        >
          Edit
        </button>
      </div>

      {/* pills (desktop horizontal scroller) */}
      <div className="tsv-pills" role="tablist" aria-label="Shifts">
        {shifts.map((s, idx) => (
          <button
            key={s.id}
            className={`tsv-pill ${selectedIndex === idx ? "active" : ""}`}
            onClick={() => setSelectedIndex(idx)}
            title={`${s.shift_name} ${s.start_time}-${s.end_time}`}
            role="tab"
            aria-selected={selectedIndex === idx}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.shift_name}</span>
            <span className="edit" onClick={(ev) => { ev.stopPropagation(); openEditModal(s); }} title="Edit">✏️</span>
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="tsv-controls">
        <div style={{ fontWeight: 600, color: "#0f172a" }}>Timeline range:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isTiny ? "100%" : "auto" }}>
          <button className="tsv-rangebtn" onClick={() => setRange({ start: 0, end: 12 * 60 })}>00:00 - 12:00</button>
          <button className="tsv-rangebtn" onClick={() => setRange({ start: 0, end: 24 * 60 })}>00:00 - 24:00</button>
          <button className="tsv-rangebtn" onClick={() => setRange({ start: 8 * 60, end: 18 * 60 })}>08:00 - 18:00</button>
        </div>
        <div style={{ marginLeft: isTiny ? 0 : "auto" }}>
          <button className="tsv-rangebtn" onClick={fetch}>Refresh</button>
        </div>
      </div>

      {/* timeline card */}
      <div className="tsv-card" role="region" aria-label="Shift timeline">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedShift ? `${selectedShift.shift_name} — ${selectedShift.start_time} to ${selectedShift.end_time}` : "No shift selected"}
          </div>
          <div style={{ color: "#475569", fontSize: 13, whiteSpace: "nowrap" }}>{selectedShift ? `Total minutes: ${selectedShift.total_minutes}` : ""}</div>
        </div>

        <div className="tsv-legend" aria-hidden={isMobile}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="tsv-swatch" style={{ background: "var(--late)" }} />
            <div className="label">late deduction</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="tsv-swatch" style={{ background: "var(--break)" }} />
            <div className="label">break</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="tsv-swatch" style={{ background: "var(--work)" }} />
            <div className="label">work time (blocks)</div>
          </div>
        </div>

        <div className="tsv-timeline-viewport" aria-hidden={false}>
          <div className="tsv-timeline-track">
            <div className="tsv-rail" />

            {/* RENDER ORDER: work -> breaks -> late */}
            {workBlocksToRender.map((w) => {
              const cb = clampBlock(w);
              return (
                <div
                  key={w.id}
                  className="tsv-block work"
                  style={{ left: `${cb.left}%`, width: `${cb.width}%` }}
                  title={w.title}
                  role="img"
                />
              );
            })}

            {breakRenderBlocks.map((b) => {
              const cb = clampBlock(b);
              return (
                <div
                  key={b.id}
                  className="tsv-block break"
                  style={{ left: `${cb.left}%`, width: `${cb.width}%` }}
                  title={b.title}
                  role="img"
                />
              );
            })}

            {lateRenderBlocks.map((l) => {
              const cl = clampBlock(l);
              return (
                <div
                  key={l.id}
                  className="tsv-block late"
                  style={{ left: `${cl.left}%`, width: `${cl.width}%` }}
                  title={l.title}
                  role="img"
                />
              );
            })}
          </div>
        </div>

        {/* ticks — responsive spacing */}
        <div className="tsv-ticks" aria-hidden>
          {tickLabels.map((mins, i) => (
            <div key={i} style={{ minWidth: 0, textAlign: "center" }}>{minutesToHHMM(mins)}</div>
          ))}
        </div>
      </div>

      {/* modal */}
      <WorkTimeFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={modalInitial}
        onSaved={() => { setModalOpen(false); handleModalSaved(); }}
      />
    </div>
  );
}

// // components/TimeShiftView.jsx
// import React, { useState, useMemo } from "react";
// import { useShiftsData } from "../schedule-manager-hooks/ShiftAPIhooks"; // adjust path
// import WorkTimeFormModal from "../../work-time/work-time-componets/WorkTimeformModal"; // adjust path to where you put the modal file

// // Inline styles (kept from your previous file, small additions for edit/add buttons)
// const styles = {
//   container: { maxWidth: 1100, margin: "0 auto", fontFamily: "Inter,Arial,Helvetica,sans-serif", color: "#111" },
//   header: { marginBottom: 8, display: "flex", alignItems: "center", gap: 12 },
//   title: { flex: 1 },
//   addButton: { marginLeft: "auto", padding: "8px 14px", background: "#29a19c", color: "white", borderRadius: 10, border: "none", cursor: "pointer" },
//   pillsWrap: { display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" },
//   pill: { padding: "10px 18px", borderRadius: 12, background: "#A7E8FF", color: "#03394A", fontWeight: 600, cursor: "pointer", boxShadow: "inset 0 -4px rgba(0,0,0,0.06)", border: "none", display: "flex", alignItems: "center", gap: 8 },
//   pillActive: { background: "#008ecb", color: "#fff" },
//   editIcon: { width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff", borderRadius: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.08)", cursor: "pointer" },
//   timelineCard: { background: "#fff", padding: 18, borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" },
//   legend: { display: "flex", gap: 18, alignItems: "center", marginBottom: 12 },
//   swatch: (bg) => ({ width: 28, height: 18, borderRadius: 4, background: bg }),
//   timelineViewport: { position: "relative", height: 44, background: "#eee", borderRadius: 6, overflow: "hidden", marginBottom: 12, boxSizing: "border-box" },
//   timelineTrack: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, height: "100%", boxSizing: "border-box" },
//   blockBase: { position: "absolute", top: 6, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#042436", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" },
//   blockWork: { background: "#9be0ff", zIndex: 1 },
//   blockBreak: { background: "#7ef48a", color: "#033", zIndex: 3 },
//   blockLate: { background: "#ff2b2b", color: "#fff", zIndex: 4 },
//   controls: { display: "flex", gap: 12, marginBottom: 10, alignItems: "center" },
//   notes: { marginTop: 18, fontSize: 13, color: "#444" }
// };

// function parseTimeToMinutes(t) {
//   if (!t) return 0;
//   const parts = t.split(":").map(Number);
//   return parts[0] * 60 + parts[1] + (parts[2] ? parts[2] / 60 : 0);
// }
// function minutesToHHMM(min) {
//   const m = Math.floor(min % 60).toString().padStart(2, "0");
//   const h = Math.floor(min / 60).toString().padStart(2, "0");
//   return `${h}:${m}`;
// }

// export default function TimeShiftView({ initialRange = { start: 0, end: 12 * 60 } }) {
//   const { workTimes, breaksByWork, lateRulesByWork, loading, error, fetch } = useShiftsData();
//   const [selectedIndex, setSelectedIndex] = useState(0);
//   const [range, setRange] = useState(initialRange);

//   // modal state
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalInitial, setModalInitial] = useState(null); // null for add, shift object for edit

//   const shifts = workTimes || [];

//   React.useEffect(() => {
//     if (shifts.length && (selectedIndex == null || selectedIndex > shifts.length - 1)) {
//       setSelectedIndex(0);
//     }
//   }, [shifts, selectedIndex]);

//   const selectedShift = shifts[selectedIndex] || null;
//   const breaksForSelected = selectedShift ? (breaksByWork[String(selectedShift.id)] || []) : [];
//   const lateAssignments = selectedShift ? (lateRulesByWork[String(selectedShift.id)] || []) : [];

//   // percent converter
//   const rangeSpan = Math.max(1, (range.end - range.start));
//   const toPercent = (mins) => {
//     const p = ((mins - range.start) / rangeSpan) * 100;
//     if (!Number.isFinite(p)) return 0;
//     return p;
//   };

//   // blocks same as before (split at is_shift_split)
//   const blocks = React.useMemo(() => {
//     if (!selectedShift) return [];
//     const shiftStart = parseTimeToMinutes(selectedShift.start_time);
//     const shiftEnd = parseTimeToMinutes(selectedShift.end_time);

//     const splits = (breaksForSelected || []).filter(b => Number(b.is_shift_split) === 1)
//       .map(b => ({ ...b, startM: parseTimeToMinutes(b.break_start), endM: parseTimeToMinutes(b.break_end) }))
//       .sort((a, b) => a.startM - b.startM);

//     if (!splits.length) return [{ index: 1, start: shiftStart, end: shiftEnd, splitBreak: null }];

//     const boundaries = [];
//     boundaries.push({ s: shiftStart, e: splits[0].startM, splitBreak: null });
//     for (let i = 0; i < splits.length - 1; i++) {
//       boundaries.push({ s: splits[i].endM, e: splits[i + 1].startM, splitBreak: splits[i] });
//     }
//     boundaries.push({ s: splits[splits.length - 1].endM, e: shiftEnd, splitBreak: splits[splits.length - 1] });

//     return boundaries.map((b, i) => ({ index: i + 1, start: b.s, end: b.e, splitBreak: b.splitBreak })).filter(b => b.end > b.start);
//   }, [selectedShift, breaksForSelected]);

//   // build render blocks (work, breaks, late) - same as your previous logic
//   const breakRenderBlocks = React.useMemo(() => {
//     return (breaksForSelected || []).map(b => {
//       const bs = parseTimeToMinutes(b.break_start), be = parseTimeToMinutes(b.break_end);
//       return { id: b.id, left: toPercent(bs), width: Math.max(0.5, toPercent(be) - toPercent(bs)), title: `${b.break_name} (${b.break_start}-${b.break_end})`, raw: b };
//     });
//   }, [breaksForSelected, range]);

//   const lateRenderBlocks = React.useMemo(() => {
//     if (!selectedShift) return [];
//     const shiftStart = parseTimeToMinutes(selectedShift.start_time);
//     const shiftEnd = parseTimeToMinutes(selectedShift.end_time);
//     const shiftValidInEnd = parseTimeToMinutes(selectedShift.valid_in_end || selectedShift.start_time);

//     const out = [];
//     for (const assignment of lateAssignments || []) {
//       const r = assignment.rule;
//       const blkIdx = assignment.block_index;
//       if (blkIdx === null) {
//         const s = shiftValidInEnd + Number(r.min_minutes || 0);
//         const e = r.max_minutes ? shiftValidInEnd + Number(r.max_minutes) : shiftEnd;
//         out.push({ id: `late-whole-${r.id}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Late (whole): ${r.min_minutes}-${r.max_minutes ?? "∞"}` });
//       } else {
//         const block = blocks.find(b => Number(b.index) === Number(blkIdx));
//         if (!block) {
//           const s = shiftValidInEnd + Number(r.min_minutes || 0);
//           const e = r.max_minutes ? shiftValidInEnd + Number(r.max_minutes) : shiftEnd;
//           out.push({ id: `late-fallback-${r.id}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Late (fallback): ${r.min_minutes}-${r.max_minutes ?? "∞"}` });
//           continue;
//         }
//         let anchorM = block.start;
//         if (block.splitBreak && block.splitBreak.endM) {
//           anchorM = block.splitBreak.endM;
//         } else {
//           if (Number(block.index) === 1) anchorM = shiftValidInEnd || block.start;
//           else anchorM = block.start;
//         }
//         const s = anchorM + Number(r.min_minutes || 0);
//         const e = r.max_minutes ? anchorM + Number(r.max_minutes) : block.end;
//         out.push({ id: `late-block-${r.id}-${blkIdx}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Late (block ${blkIdx}): ${r.min_minutes}-${r.max_minutes ?? "∞"}` });
//       }
//     }

//     // Auto-late markers for splits without rules (same logic as before)
//     const splitBreaks = blocks.map(b => ({ block: b, split: b.splitBreak })).filter(x => x.split);
//     for (const sb of splitBreaks) {
//       const blockIndex = sb.block.index;
//       const hasRuleForBlock = out.some(o => o.id.includes(`-block-`) && o.id.endsWith(`-${blockIndex}`));
//       if (!hasRuleForBlock) {
//         const anchor = sb.split.endM || sb.block.start;
//         const autoMinutes = 10;
//         const s = anchor + 0;
//         const e = s + autoMinutes;
//         out.push({ id: `late-auto-${sb.split.id}`, left: toPercent(s), width: Math.max(0.5, toPercent(e) - toPercent(s)), title: `Auto late (no rule)` });
//       }
//     }

//     return out;
//   }, [selectedShift, lateAssignments, blocks, range]);

//   const workBlocksToRender = React.useMemo(() => {
//     return blocks.map(b => ({ id: `work-${b.index}`, left: toPercent(b.start), width: Math.max(0.5, toPercent(b.end) - toPercent(b.start)), title: `Block ${b.index}: ${minutesToHHMM(b.start)} - ${minutesToHHMM(b.end)}` }));
//   }, [blocks, range]);

//   const clampBlock = (block) => {
//     const left = Math.max(0, Math.min(100, block.left));
//     const right = Math.max(0, Math.min(100, block.left + block.width));
//     return { ...block, left, width: Math.max(0.5, right - left) };
//   };

//   // Modal handlers
//   const openAddModal = () => {
//     setModalInitial(null);
//     setModalOpen(true);
//   };
//   const openEditModal = (shift) => {
//     setModalInitial({
//       ...shift,
//       // ensure boolean/number types match the form expectations (modal toggles is_default as 0/1)
//       is_default: Number(shift.is_default) === 1 ? 1 : 0
//     });
//     setModalOpen(true);
//   };
//   const handleModalSaved = () => {
//     // after create/update refresh shifts
//     fetch();
//   };

//   if (loading) return <div style={styles.container}><div>Loading shifts...</div></div>;
//   if (error) return <div style={styles.container}><div style={{ color: "red" }}>Error: {error}</div></div>;

//   return (
//     <div style={styles.container}>
//       <div style={styles.header}>
//         <h2 style={styles.title}>Time Shift View (split blocks)</h2>
//         <button onClick={openAddModal} style={styles.addButton}>+ Add Shift</button>
//       </div>

//       <div style={styles.pillsWrap}>
//         {shifts.map((s, idx) => (
//           <div key={s.id} style={{ ...styles.pill, ...(selectedIndex === idx ? styles.pillActive : {}) }} onClick={() => setSelectedIndex(idx)}>
//             <span>{s.shift_name}</span>
//             <span title="Edit" style={styles.editIcon} onClick={(ev) => { ev.stopPropagation(); openEditModal(s); }}>
//               ✏️
//             </span>
//           </div>
//         ))}
//       </div>

//       <div style={styles.controls}>
//         <label>Timeline range:</label>
//         <button style={styles.pill} onClick={() => setRange({ start: 0, end: 12 * 60 })}>00:00 - 12:00</button>
//         <button style={styles.pill} onClick={() => setRange({ start: 0, end: 24 * 60 })}>00:00 - 24:00</button>
//         <button style={styles.pill} onClick={() => setRange({ start: 8 * 60, end: 18 * 60 })}>08:00 - 18:00</button>
//         <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
//           <button style={styles.pill} onClick={fetch}>Refresh</button>
//         </div>
//       </div>

//       <div style={styles.timelineCard}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
//           <div style={{ fontWeight: 700 }}>{selectedShift ? `${selectedShift.shift_name} — ${selectedShift.start_time} to ${selectedShift.end_time}` : "No shift selected"}</div>
//           <div style={{ fontSize: 13, color: "#444" }}>{selectedShift ? `Total minutes: ${selectedShift.total_minutes}` : ""}</div>
//         </div>

//         <div style={styles.legend}>
//           <div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={styles.swatch("#ff2b2b")}></div>late deduction</div>
//           <div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={styles.swatch("#7ef48a")}></div>break</div>
//           <div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={styles.swatch("#9be0ff")}></div>work time (blocks)</div>
//         </div>

//         <div style={styles.timelineViewport}>
//           <div style={styles.timelineTrack}>
//             {workBlocksToRender.map(w => {
//               const cb = clampBlock(w);
//               return <div key={w.id} title={w.title} style={{ left: `${cb.left}%`, width: `${cb.width}%`, ...styles.blockBase, ...styles.blockWork }} />;
//             })}

//             {breakRenderBlocks.map(b => {
//               const cb = clampBlock(b);
//               return <div key={b.id} title={b.title} style={{ left: `${cb.left}%`, width: `${cb.width}%`, ...styles.blockBase, ...styles.blockBreak }} />;
//             })}

//             {lateRenderBlocks.map(l => {
//               const cl = clampBlock(l);
//               return <div key={l.id} title={l.title} style={{ left: `${cl.left}%`, width: `${cl.width}%`, ...styles.blockBase, ...styles.blockLate }} />;
//             })}
//           </div>
//         </div>

//         <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
//           {Array.from({ length: Math.floor((range.end - range.start) / 60) + 1 }, (_, i) => {
//             const mins = range.start + i * 60;
//             return <div key={i} style={{ fontSize: 13, color: "#333" }}>{minutesToHHMM(mins)}</div>;
//           })}
//         </div>
//       </div>

//       {/* <div style={styles.notes}>
//         <div style={{ marginBottom: 6 }}><strong>Notes / Assumptions</strong></div>
//         <ul>
//           <li>Click the pencil on a pill to edit that shift.</li>
//           <li>Click <strong>+ Add Shift</strong> to create a new shift.</li>
//           <li>After save the list and timeline auto-refresh via the hook's <code>fetch()</code>.</li>
//         </ul>
//       </div> */}

//       {/* WorkTime modal */}
//       <WorkTimeFormModal
//         isOpen={modalOpen}
//         onClose={() => setModalOpen(false)}
//         initialData={modalInitial}
//         onSaved={() => { setModalOpen(false); handleModalSaved(); }}
//       />
//     </div>
//   );
// }



