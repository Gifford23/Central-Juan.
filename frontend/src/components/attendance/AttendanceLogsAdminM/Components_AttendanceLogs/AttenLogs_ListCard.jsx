import React from "react";
import {
  Clock,
  Sun,
  CloudSun,
  CalendarDays,
  BadgeCheck,
  Timer,
  User,
  Hash,
} from "lucide-react";

// ─────────────────────────────────────────────
// TIME BADGE — displays a single time value
// ─────────────────────────────────────────────
function TimeBadge({ time, isNA }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums ${
        isNA
          ? "bg-slate-50 text-slate-300 border border-slate-100"
          : "bg-white text-slate-700 border border-slate-200 shadow-sm"
      }`}
    >
      {isNA ? "—" : time}
    </span>
  );
}

// ─────────���───────────────────────────────────
// TIME ROW — Morning / Afternoon row
// ─────────────────────────────────────────────
function TimeRow({ icon: Icon, label, timeIn, timeOut, color }) {
  const colors = {
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`p-1 rounded-md border shrink-0 ${colors[color] || colors.orange}`}
      >
        <Icon size={12} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-1">
          {label}
        </p>
        <div className="flex items-center gap-1">
          <TimeBadge time={timeIn.display} isNA={timeIn.isNA} />
          <span className="text-[10px] text-slate-300 font-medium">→</span>
          <TimeBadge time={timeOut.display} isNA={timeOut.isNA} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT CHIP — Credited / Overtime
// ─────────────────────────────────────────────
function StatChip({ icon: Icon, label, value, variant }) {
  const variants = {
    emerald: "bg-emerald-50/80 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50/80 text-blue-700 border-blue-100",
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${variants[variant] || variants.emerald}`}
    >
      <Icon size={11} className="shrink-0 opacity-70" />
      <span className="opacity-60 font-medium">{label}</span>
      <span className="ml-auto">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AttendanceListCard = ({ item, formatTime, isMidnight }) => {
  // Pre-compute time displays
  const times = {
    morningIn: formatTime(item.time_in_morning),
    morningOut: formatTime(item.time_out_morning),
    afternoonIn: formatTime(item.time_in_afternoon),
    afternoonOut: formatTime(item.time_out_afternoon),
  };

  const makeTime = (raw) => ({
    display: isMidnight(raw) ? "—" : raw,
    isNA: isMidnight(raw),
  });

  // Generate avatar color from employee name
  const nameHash = item.employee_name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarHue = (nameHash * 47) % 360;

  const initials = item.employee_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group relative rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300 overflow-hidden">
      {/* Left accent bar */}
      <div
        className="absolute top-0 left-0 w-[3px] h-full rounded-l-2xl transition-all duration-300 group-hover:w-[4px]"
        style={{
          background: `linear-gradient(180deg, hsl(${avatarHue}, 55%, 55%), hsl(${(avatarHue + 30) % 360}, 50%, 60%))`,
        }}
      />

      <div className="pl-4 pr-4 pt-4 pb-3.5">
        {/* ── Header: Avatar + Name + ID ─────── */}
        <div className="flex items-center gap-3 mb-3.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm ring-2 ring-white"
            style={{
              background: `linear-gradient(135deg, hsl(${avatarHue}, 60%, 50%), hsl(${(avatarHue + 30) % 360}, 55%, 58%))`,
            }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-800 truncate leading-tight">
              {item.employee_name}
            </h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Hash size={10} className="text-slate-300 shrink-0" />
              <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                {item.employee_id}
              </span>
            </div>
          </div>

          {/* Date badge */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg shrink-0">
            <CalendarDays size={10} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
              {new Date(item.attendance_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* ── Divider ────────────────────────── */}
        <div className="h-px bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 mb-3" />

        {/* ── Time Rows ──────────────────────── */}
        <div className="space-y-2.5 mb-3.5">
          <TimeRow
            icon={Sun}
            label="Morning"
            timeIn={makeTime(times.morningIn)}
            timeOut={makeTime(times.morningOut)}
            color="orange"
          />
          <TimeRow
            icon={CloudSun}
            label="Afternoon"
            timeIn={makeTime(times.afternoonIn)}
            timeOut={makeTime(times.afternoonOut)}
            color="indigo"
          />
        </div>

        {/* ── Divider ────────────────────────── */}
        <div className="h-px bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 mb-3" />

        {/* ── Stats Row ──────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <StatChip
            icon={BadgeCheck}
            label="Credited"
            value={item.days_credited}
            variant="emerald"
          />
          <StatChip
            icon={Timer}
            label="OT"
            value={`${item.overtime_hours}h`}
            variant="blue"
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceListCard;
