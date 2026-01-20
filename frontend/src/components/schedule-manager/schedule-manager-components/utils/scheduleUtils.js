// utils/scheduleUtils.js
export const MONTHS_SHORT_DOT = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

export const fmtHeader = (isoDate) => {
  if (!isoDate) return "";
  const dt = new Date(`${isoDate}T00:00:00`);
  if (isNaN(dt)) return isoDate;
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const isSunday = (isoDate) => {
  if (!isoDate) return false;
  const dt = new Date(`${isoDate}T00:00:00`);
  return dt.getDay() === 0;
};

export const fmtDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(String(isoDate).includes("T") ? isoDate : `${isoDate}T00:00:00`);
  if (isNaN(d)) return isoDate;
  const mon = MONTHS_SHORT_DOT[d.getMonth()] || "";
  return `${mon} ${d.getDate()}, ${d.getFullYear()}`;
};

export const colorForId = (id) => {
  if (id == null) return "#f1f5f9";
  const n = parseInt(String(id).replace(/\D/g, "") || "0", 10);
  const hue = (n * 137) % 360;
  return `hsl(${hue}deg 75% 48%)`;
};

// Time helpers
export const _isHumanTime = (s) => typeof s === "string" && /[ap]m/i.test(s);

export const parseTimeToDate = (timeStr) => {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  if (_isHumanTime(s)) return s;
  const parts = s.split(":").map((p) => p.replace(/\D/g, ""));
  if (!parts.length) return null;
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  const ss = parseInt(parts[2] || "0", 10);
  const d = new Date();
  d.setHours(hh, mm, ss, 0);
  return d;
};

export const formatTimeShort = (timeStr) => {
  if (!timeStr && timeStr !== 0) return "";
  if (_isHumanTime(String(timeStr))) {
    return String(timeStr).replace(/\s+/g, " ").toLowerCase();
  }
  const d = parseTimeToDate(timeStr);
  if (!d || !(d instanceof Date)) return String(timeStr);
  try {
    const formatted = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return formatted.toLowerCase();
  } catch {
    const hh = d.getHours() % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "pm" : "am";
    return `${hh}:${mm} ${ampm}`;
  }
};

export const formatTimeRange = (start, end) => {
  const s = formatTimeShort(start);
  const e = formatTimeShort(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  return e || "";
};
