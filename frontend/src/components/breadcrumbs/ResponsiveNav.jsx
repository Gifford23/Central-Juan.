// src/components/ui/ResponsiveNav.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * items: [{ key, label, sublabel?, shortLabel?, icon: IconComponent, path?, onClick? }]
 *
 * Desktop: elongated cards with left icon box (like screenshot).
 * Mobile: icon-only buttons.
 */
const ResponsiveNav = ({ items = [], className = "" }) => {
  const navigate = useNavigate();

  const handleClick = (it) => {
    if (typeof it.onClick === "function") return it.onClick();
    if (it.path) return navigate(it.path);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop / tablet cards */}
      <div className="items-stretch hidden md:flex md:flex-row md:gap-4 lg:gap-6">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => handleClick(it)}
              type="button"
              className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-300 bg-white shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-label={it.label}
              style={{ minWidth: 320 }}
            >
              {/* left icon box */}
              <div className="flex items-center justify-center w-12 h-12 border rounded-md bg-slate-50">
                {Icon ? <Icon size={18} /> : null}
              </div>

              {/* text */}
              <div className="text-left">
                <div className="text-sm font-semibold leading-tight text-slate-800">{it.label}</div>
                {it.sublabel && <div className="text-xs text-slate-400 mt-0.5">{it.sublabel}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: icon-only horizontal scroller */}
      <div className="flex gap-3 py-2 overflow-x-auto md:hidden">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => handleClick(it)}
              type="button"
              className="flex flex-col items-center justify-center min-w-[64px] p-2 rounded-lg bg-white border shadow-sm"
              aria-label={it.label}
            >
              <div className="flex items-center justify-center w-9 h-9">
                {Icon ? <Icon size={18} /> : null}
              </div>
              <div className="w-full mt-1 text-xs text-center truncate">{it.shortLabel ?? it.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ResponsiveNav;
