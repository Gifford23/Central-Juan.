// components/Avatar.jsx
import React, { useMemo, useState } from "react";
import BASE_URL from "../../backend/server/config";
// Props:
// - src: image path (relative or absolute)
// - name: full name to generate initials fallback
// - sizeClass: tailwind classes for size, e.g. "w-10 h-10" (default "w-10 h-10")
// - className: extra classes
// - status: optional string e.g. 'active' | 'inactive' to show status dot
export default function Avatar({ src, name = "", sizeClass = "w-10 h-10", className = "", status = null }) {
  const [errored, setErrored] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const initials = useMemo(() => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  const finalSrc = useMemo(() => {
    if (!src) return null;
    const s = String(src || "");
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
    // normalize and prefix BASE_URL (avoid double slashes)
    const trimmed = s.replace(/^\/+/, "");
    // ensure BASE_URL has no trailing slash
    const base = typeof BASE_URL === "string" ? String(BASE_URL).replace(/\/+$/, "") : "";
    return base ? `${base}/${trimmed}` : `/${trimmed}`;
  }, [src]);

  // choose status color: active -> green, inactive -> red, unknown -> slate
  const statusColor = status === "active"
    ? "bg-emerald-500"
    : status === "inactive"
    ? "bg-red-500"
    : "bg-slate-400";

  return (
    <div className={`relative inline-block ${className}`}>
      {finalSrc && !errored ? (
        <img
          src={finalSrc}
          alt={name || "avatar"}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`${sizeClass} rounded-full object-cover border border-slate-100 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div
          aria-hidden="true"
          className={`${sizeClass} rounded-full bg-slate-100 text-slate-700 font-medium flex items-center justify-center`}
        >
          {initials}
        </div>
      )}

      {/* status dot (small) */}
      {status !== null && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 block w-3 h-3 rounded-full ring-2 ring-white ${statusColor}`}
          title={status}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
