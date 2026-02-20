import React, { useEffect, useState, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import BASE_URL from "../../../backend/server/config";
import {
  X,
  Search,
  Users,
  MapPin,
  Phone,
  ChartPie,
  Sparkles,
  Building2,
} from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// ─────────────────────────────────────────────
// PALETTE — green · orange · blue · rose-red
// Cycles in groups of 4, with tonal variants
// ───────────���─────────────────────────────────
const CHART_COLORS = [
  "#22c55e", // green-500
  "#f97316", // orange-500
  "#3b82f6", // blue-500
  "#f43f5e", // rose-500
  "#16a34a", // green-600
  "#ea580c", // orange-600
  "#2563eb", // blue-600
  "#f43f5e", // rose-500
  "#15803d", // green-700
  "#c2410c", // orange-700
];

// ─────────────────────────────────────────────
// CENTER TEXT PLUGIN (unchanged logic)
// ─────────────────────────────────────────────
const centerTextPlugin = {
  id: "centerText",
  beforeDraw: (chart) => {
    const {
      ctx,
      chartArea: { top, bottom, left, right },
    } = chart;
    if (!chart.data?.datasets?.length) return;

    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const data = chart.data.datasets[0].data;
    const total = data.reduce((a, b) => a + b, 0);
    if (!total) return;

    const maxValue = Math.max(...data);
    const maxIndex = data.indexOf(maxValue);
    const rawLabel = chart.data.labels[maxIndex] || "";
    const percentage = ((maxValue / total) * 100).toFixed(1);

    const chartSize = Math.min(right - left, bottom - top);
    const scale = chartSize / 280;
    const percentSize = Math.max(18, 36 * scale);
    const labelSize = Math.max(9, 13 * scale);
    const captionSize = Math.max(8, 11 * scale);
    const safeLabel =
      rawLabel.length > 16 ? rawLabel.slice(0, 16) + "…" : rawLabel;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Percentage — bold, uses the colour of the largest segment
    const topColor = CHART_COLORS[maxIndex % CHART_COLORS.length];
    ctx.font = `700 ${percentSize}px 'Inter', system-ui`;
    ctx.fillStyle = topColor;
    ctx.fillText(`${percentage}%`, centerX, centerY - percentSize * 0.5);

    // Department name
    ctx.font = `600 ${labelSize}px 'Inter', system-ui`;
    ctx.fillStyle = "#475569";
    ctx.fillText(safeLabel, centerX, centerY + labelSize * 0.6);

    // Caption
    ctx.font = `400 ${captionSize}px 'Inter', system-ui`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("largest dept", centerX, centerY + labelSize * 2.2);

    ctx.restore();
  },
};

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-8 animate-pulse">
      <div className="relative mb-6">
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-slate-200" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white" />
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {/* Skeleton chips in palette colours */}
        {["#22c55e", "#f97316", "#3b82f6", "#f43f5e", "#16a34a"].map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: `${c}55` }}
            />
            <div
              className="h-3 rounded-md"
              style={{ width: `${48 + i * 12}px`, background: `${c}22` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPLOYEE CARD
// ─────────────────────────────────────────────
function EmployeeCard({ emp, colorIndex }) {
  const accentColor = CHART_COLORS[colorIndex % CHART_COLORS.length];

  return (
    <div
      className="group relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 overflow-hidden cursor-default"
      role="listitem"
    >
      {/* Left colour accent bar */}
      <div
        className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: accentColor }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
        style={{ background: `${accentColor}0a` }}
      />

      <div className="relative flex items-start gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          {emp.image ? (
            <img
              src={emp.image}
              alt={emp.full_name}
              className="w-11 h-11 rounded-xl object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-shadow"
            />
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
              }}
            >
              {emp.full_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          {/* Online dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p
              className="text-sm font-bold text-slate-900 truncate leading-tight transition-colors group-hover:text-opacity-80"
              style={{ "--tw-text-opacity": 1 }}
            >
              {emp.full_name}
            </p>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0 border border-slate-200">
              {emp.employee_id}
            </span>
          </div>

          <p
            className="text-xs font-semibold truncate mb-2"
            style={{ color: accentColor }}
          >
            {emp.position_name || "—"}
          </p>

          <div className="flex flex-col gap-1">
            {emp.branch_name && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{emp.branch_name}</span>
              </div>
            )}
            {emp.contact_number && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Phone size={10} className="shrink-0" />
                <span className="truncate">{emp.contact_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const DepartmentDoughnutChart = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeesCache, setEmployeesCache] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDept, setModalDept] = useState("");
  const [modalColorIdx, setModalColorIdx] = useState(0);
  const [matched, setMatched] = useState([]);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef(null);

  // ── Data fetch (unchanged) ────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/graphs/get_positions.php`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();

        setChartData({
          labels: data.map((item) => item.department),
          datasets: [
            {
              label: "Number of Positions",
              data: data.map((item) => item.position_count),
              backgroundColor: CHART_COLORS.slice(0, data.length),
              hoverBackgroundColor: CHART_COLORS.slice(0, data.length),
              borderWidth: 3,
              borderColor: "#ffffff",
              hoverOffset: 10,
            },
          ],
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Employee fetch & cache (unchanged) ────
  const fetchEmployees = async () => {
    if (employeesCache) return employeesCache;
    try {
      const res = await fetch(`${BASE_URL}/employeesSide/employees.php`);
      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployeesCache(data);
      return data;
    } catch (err) {
      console.error(err);
      setEmployeesCache([]);
      return [];
    }
  };

  // ── Open modal (unchanged logic) ─────────
  const openModalForDepartment = async (departmentLabel, colorIndex) => {
    const allEmployees = await fetchEmployees();
    const deptLower = String(departmentLabel || "")
      .trim()
      .toLowerCase();

    const matchedList = (Array.isArray(allEmployees) ? allEmployees : [])
      .filter((emp) => {
        const deptMatch =
          String(emp.department_name ?? "")
            .trim()
            .toLowerCase() === deptLower;
        const isActive =
          String(emp.status ?? "")
            .trim()
            .toLowerCase() === "active";
        return deptMatch && isActive;
      })
      .map((emp) => ({
        ...emp,
        full_name: [emp.first_name, emp.middle_name, emp.last_name]
          .filter(Boolean)
          .join(" ")
          .replace(/\s+/g, " "),
      }));

    setModalDept(departmentLabel);
    setModalColorIdx(colorIndex);
    setMatched(matchedList);
    setSearch("");
    setModalOpen(true);
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 120);
  };

  // ── ESC key (unchanged) ───────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && modalOpen) setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // ── Filtered employees (unchanged) ────────
  const filteredMatched = matched.filter((emp) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      emp.full_name.toLowerCase().includes(q) ||
      String(emp.employee_id ?? "")
        .toLowerCase()
        .includes(q) ||
      String(emp.position_name ?? "")
        .toLowerCase()
        .includes(q)
    );
  });

  const modalColor = CHART_COLORS[modalColorIdx % CHART_COLORS.length];

  // ── Palette-aware focus ring for modal close btn ──
  const focusRingFor = (hex) => {
    if (hex.startsWith("#22") || hex.startsWith("#16") || hex.startsWith("#15"))
      return "focus:ring-green-300";
    if (hex.startsWith("#f9") || hex.startsWith("#ea") || hex.startsWith("#c2"))
      return "focus:ring-orange-300";
    if (hex.startsWith("#3b") || hex.startsWith("#25"))
      return "focus:ring-blue-300";
    return "focus:ring-rose-500";
  };

  // ── Chart options (unchanged) ─────────────
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    onClick: (evt, elements) => {
      if (!elements?.length) return;
      const idx = elements[0].index;
      const label = chartData.labels[idx];
      if (label) openModalForDepartment(label, idx);
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
          color: "#475569",
          font: (ctx) => ({
            size: ctx.chart.width < 480 ? 10 : 12,
            weight: "600",
            family: "'Inter', system-ui",
          }),
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        titleColor: "#f1f5f9",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 14,
        displayColors: true,
        boxWidth: 10,
        boxHeight: 10,
        callbacks: {
          title: (items) => items[0]?.label || "",
          label: (ctx) => {
            const v = ctx.raw ?? ctx.parsed;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((v / total) * 100).toFixed(1);
            return `  ${v} positions · ${pct}%`;
          },
        },
      },
      centerText: true,
    },
  };

  // ── Loading ──────────���────────────────────
  if (loading)
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[400px] px-4">
        <ChartSkeleton />
        <p className="text-xs text-slate-400 font-medium mt-2 animate-pulse">
          Loading department data...
        </p>
      </div>
    );

  // ── Error ─────────────────────────────────
  if (error)
    return (
      <div className="w-full flex items-center justify-center min-h-[400px] px-4">
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 max-w-sm text-center shadow-sm">
          <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-rose-700 font-bold text-sm mb-1">
            Unable to load data
          </p>
          <p className="text-rose-500 text-xs leading-relaxed">{error}</p>
        </div>
      </div>
    );

  // ─────────────────────────────────────────
  // MAIN RENDER
  // ──────────��──────────────────────────────
  return (
    <div className="flex flex-col w-full items-center px-2 sm:px-3 py-3 sm:py-4">
      {/* ── Chart header ─────────────────── */}
      <div className="text-center mb-4 px-2">
        <div className="inline-flex items-center gap-2 mb-2">
          {/* Header icon uses the 4-colour gradient */}
          <div
            className="p-1.5 rounded-lg"
            style={{
              background: "linear-gradient(135deg, #22c55e22, #3b82f622)",
            }}
          ></div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            Department Positions
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          Click any segment or chip to view department employees
        </p>
      </div>

      {/* ── Doughnut chart ───────────────── */}
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        <div className="relative group">
          {/* Ambient 4-colour glow */}
          <div
            className="absolute inset-4 rounded-full blur-2xl transition-all duration-500 pointer-events-none opacity-60 group-hover:opacity-90"
            style={{
              background:
                "conic-gradient(from 0deg, #22c55e33, #f9731633, #3b82f633, #f43f5e33, #22c55e33)",
            }}
          />
          {/* Chart card */}
          <div className="relative bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] xl:h-[500px]">
              <Doughnut
                data={chartData}
                options={options}
                plugins={[centerTextPlugin]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Department chips ─────────────── */}
      {chartData.labels.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 px-2">
          {chartData.labels.map((label, idx) => {
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <button
                key={label}
                onClick={() => openModalForDepartment(label, idx)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 focus:outline-none"
                style={{
                  borderColor: `${color}40`,
                  color,
                  background: `${color}10`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: color }}
                />
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          MODAL
      ══════════════════════════════════════ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dept-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px] transition-opacity"
            onClick={() => setModalOpen(false)}
          />

          {/* Panel */}
          <div
            className="relative w-full sm:max-w-2xl lg:max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200/80 shadow-2xl shadow-slate-900/20 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden"
            style={{
              animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient accent — uses the dept's palette colour */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, ${modalColor}cc, ${modalColor}, ${modalColor}cc)`,
              }}
            />

            {/* ── Modal Header ─────────────── */}
            <div className="px-5 sm:px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2.5 rounded-xl shrink-0 mt-0.5 shadow-sm"
                    style={{ background: `${modalColor}15` }}
                  >
                    <Building2 size={18} style={{ color: modalColor }} />
                  </div>
                  <div>
                    <h3
                      id="dept-modal-title"
                      className="text-base sm:text-lg font-bold text-slate-900 leading-tight"
                    >
                      {modalDept}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Department · Active employees
                    </p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                  className={`p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 ${focusRingFor(modalColor)}`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{
                    background: `${modalColor}12`,
                    color: modalColor,
                    borderColor: `${modalColor}35`,
                  }}
                >
                  <Users size={11} />
                  {matched.length}{" "}
                  {matched.length === 1 ? "employee" : "employees"}
                </div>
                {search && filteredMatched.length !== matched.length && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <Sparkles size={11} />
                    {filteredMatched.length} matching
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="relative group">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors pointer-events-none group-focus-within:text-slate-600"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID, or position..."
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all duration-200"
                  style={{ "--tw-ring-color": `${modalColor}40` }}
                  onFocus={(e) => {
                    e.target.style.boxShadow = `0 0 0 3px ${modalColor}25`;
                    e.target.style.borderColor = `${modalColor}60`;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = "";
                    e.target.style.borderColor = "";
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Employee List ─────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Sticky sub-header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-5 sm:px-6 py-2 border-b border-slate-50 z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {filteredMatched.length}{" "}
                  {filteredMatched.length === 1 ? "employee" : "employees"}
                  {search && (
                    <span
                      className="ml-1.5 normal-case font-semibold tracking-normal"
                      style={{ color: modalColor }}
                    >
                      for "{search}"
                    </span>
                  )}
                </p>
              </div>

              <div className="px-4 sm:px-5 py-4">
                {filteredMatched.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner"
                      style={{ background: `${modalColor}12` }}
                    >
                      <Users size={22} style={{ color: `${modalColor}99` }} />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">
                      No employees found
                    </p>
                    <p className="text-xs text-slate-400">
                      {search
                        ? "Try a different search term."
                        : "No active staff assigned to this department."}
                    </p>
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="mt-3 text-xs font-semibold transition-colors hover:opacity-70"
                        style={{ color: modalColor }}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="grid gap-3 grid-cols-1 sm:grid-cols-2"
                    role="list"
                  >
                    {filteredMatched.map((emp) => (
                      <EmployeeCard
                        key={emp.employee_id}
                        emp={emp}
                        colorIndex={chartData.labels.indexOf(modalDept)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Modal Footer ─────────────── */}
            <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Press{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded-md text-slate-500 shadow-sm">
                  ESC
                </kbd>{" "}
                to close
              </p>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:opacity-90 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${modalColor}, ${modalColor}cc)`,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal entrance animation */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
};

export default DepartmentDoughnutChart;
