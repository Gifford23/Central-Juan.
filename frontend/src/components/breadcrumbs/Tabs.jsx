// src/components/ui/Tabs.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Compact tabs/cards for breadcrumb-like UI.
 * items: [{ key, label, sublabel?, icon?, path?, onClick? }]
 * activeKey: optional string to mark active tab
 */
const Tabs = ({ items = [], activeKey = null, className = "" }) => {
  const navigate = useNavigate();

  const handle = (it) => {
    if (typeof it.onClick === "function") return it.onClick();
    if (it.path) return navigate(it.path);
  };

  return (
    <div className={`flex gap-3 items-center overflow-auto ${className}`} role="tablist" aria-label="Page tabs">
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = activeKey ? activeKey === it.key : false;

        return (
          <button
            key={it.key}
            onClick={() => handle(it)}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${
              isActive ? "border-slate-800 bg-white shadow-sm" : "border-slate-300 bg-white hover:shadow-sm"
            } text-sm`}
            style={{ minWidth: 260 }}
          >
            {Icon ? (
              <div className="flex items-center justify-center border rounded-md w-9 h-9 bg-slate-50">
                <Icon size={16} />
              </div>
            ) : null}

            <div className="text-left">
              <div className="text-sm font-semibold leading-tight text-slate-800">{it.label}</div>
              {it.sublabel && <div className="text-xs text-slate-400 mt-0.5">{it.sublabel}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
