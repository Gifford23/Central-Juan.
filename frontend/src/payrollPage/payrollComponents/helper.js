// payrollComponents/helpers.js
export function fmtNumber(n) {
  const v = Number(n || 0);
  return v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]);
}

export function coalesce() {
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (a !== null && a !== undefined) return a;
  }
  return null;
}
