// components/breadcrumbs/Breadcrumbs.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/**
 * Breadcrumbs (tile-style) with active detection by current route.
 *
 * Behavior:
 * - If `activeIndex` prop is provided, it forces the active item.
 * - Otherwise tries to match `location.pathname` against item.path:
 *     1) exact match
 *     2) longest prefix match (useful for nested routes)
 * - If no match found, falls back to the last item.
 *
 * Items shape: string or { label, path?, description? }
 */

const TileBreadcrumb = ({ item, isActive }) => {
  const label = typeof item === "string" ? item : item.label;
  const description = typeof item === "string" ? null : item.description;

  const rootClass = `flex items-center gap-3 px-4 py-2 rounded-lg border transition-shadow ${
    isActive ? "bg-white shadow-lg border-slate-300" : "bg-white/60 border-slate-200 hover:shadow-md"
  }`;

  const accentStyle = {
    width: 6,
    height: 40,
    borderRadius: 6,
    background: isActive
      ? "linear-gradient(180deg, #2563EB 0%, #60A5FA 100%)"
      : "linear-gradient(180deg, #EEF2FF 0%, #E0F2FE 100%)",
    flexShrink: 0,
  };

  return (
    <div className={rootClass} style={{ minWidth: 220 }}>
      <div style={accentStyle} />
      <div className="flex flex-col overflow-hidden text-left">
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        {description ? (
          <Typography variant="caption" noWrap sx={{ color: "rgba(15,23,42,0.6)" }}>
            {description}
          </Typography>
        ) : null}
      </div>
    </div>
  );
};

TileBreadcrumb.propTypes = {
  item: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  isActive: PropTypes.bool,
};

const InlineBreadcrumb = ({ items, activeIndex }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm text-slate-700">
      {items.map((it, idx) => {
        const label = typeof it === "string" ? it : it.label;
        const path = typeof it === "string" ? null : it.path;
        const isLast = idx === items.length - 1;
        const isActive = activeIndex === idx || (activeIndex == null && isLast);

        return (
          <React.Fragment key={idx}>
            {path && !isLast ? (
              <Link to={path} className={`text-slate-700 hover:underline font-medium ${isActive ? "text-slate-900" : ""}`}>
                {label}
              </Link>
            ) : (
              <span className={`font-medium ${isActive ? "text-slate-900" : "text-slate-700"}`}>{label}</span>
            )}
            {idx < items.length - 1 && (
              <span className="mx-2 text-slate-400">
                <ChevronRight size={16} />
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

InlineBreadcrumb.propTypes = {
  items: PropTypes.array.isRequired,
  activeIndex: PropTypes.number,
};

const Breadcrumbs = ({ items = [], compact = false, className = "", activeIndex = null }) => {
  const list = Array.isArray(items) ? items : [];
  const location = useLocation();

  // If explicit activeIndex provided, use it.
  // Otherwise determine best match using location.pathname.
  const resolvedActiveIndex = useMemo(() => {
    if (Number.isInteger(activeIndex)) {
      // respect explicit override
      if (activeIndex >= 0 && activeIndex < list.length) return activeIndex;
      return null;
    }

    // build pathname candidates
    const path = location?.pathname || "";
    if (!path || list.length === 0) return list.length - 1;

    // Find exact match first
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const p = typeof it === "string" ? null : it.path;
      if (p && p === path) return i;
    }

    // Longest prefix match (helps with nested routes like /attendance/shift/123)
    let bestIndex = -1;
    let bestLen = -1;
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      const p = typeof it === "string" ? null : it.path;
      if (!p) continue;
      // ensure prefix boundary (so /a matches /a and /a/b but /ab doesn't match /a)
      if (path === p || path.startsWith(p.endsWith("/") ? p : p + "/") || path.startsWith(p)) {
        if (p.length > bestLen) {
          bestLen = p.length;
          bestIndex = i;
        }
      }
    }
    if (bestIndex >= 0) return bestIndex;

    // fallback to last item
    return list.length - 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, list, location?.pathname]);

  const useInline = compact || list.length > 5;

  if (useInline) {
    return (
      <Box className={`flex items-center ${className}`}>
        <InlineBreadcrumb items={list} activeIndex={resolvedActiveIndex} />
      </Box>
    );
  }

  return (
    <Box className={`flex flex-wrap gap-3 items-center ${className}`} role="navigation" aria-label="Breadcrumb">
      {list.map((it, idx) => {
        const path = typeof it === "string" ? null : it.path;
        const isActive = idx === resolvedActiveIndex;

        // tile: clickable if item has path and not active; active tile still rendered as non-link
        return (
          <React.Fragment key={idx}>
            {path && !isActive ? (
              <Link to={path} className="no-underline" aria-current={isActive ? "page" : undefined}>
                <TileBreadcrumb item={it} isActive={isActive} />
              </Link>
            ) : (
              <div aria-current={isActive ? "page" : undefined}>
                <TileBreadcrumb item={it} isActive={isActive} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

Breadcrumbs.propTypes = {
  items: PropTypes.array,
  compact: PropTypes.bool,
  className: PropTypes.string,
  activeIndex: PropTypes.number, // optional override
};

export default Breadcrumbs;





// // Breadcrumbs.js
// import { ChevronRightIcon } from 'lucide-react';
// import React from 'react';
// import { Link } from 'react-router-dom';

// const Breadcrumbs = ({ items }) => {
//     return (
//         <nav className="flex items-center space-x-1 ">
//             {items.map((item, index) => (
//                 <React.Fragment key={index}>
//                     {item.path ? (
//                         <Link to={item.path} className='text-sm font-bold nb-breadcrumbs-srcpath'>
//                             {item.label}
//                         </Link>
//                     ) : (
//                         <span className="text-sm font-bold nb-breadcrumbs-crntpath">{item.label}</span>
//                     )}
//                     {index < items.length - 1 && <span> <ChevronRightIcon size={18}/> </span>}
//                 </React.Fragment>
//             ))}
//         </nav>
//     );
// };

// export default Breadcrumbs;