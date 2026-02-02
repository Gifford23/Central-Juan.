// src/DepartmentDoughnutChart.js
import React, { useEffect, useState, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";
import BASE_URL from "../../../backend/server/config";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

// Custom plugin for center text
const centerTextPlugin = {
  id: "centerText",
  beforeDraw: (chart) => {
    const {
      ctx,
      width,
      height,
      chartArea: { top, bottom, left, right },
    } = chart;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;

    // Get total value
    const data = chart.data.datasets[0].data;
    const total = data.reduce((a, b) => a + b, 0);

    // Find the largest segment
    const maxValue = Math.max(...data);
    const maxIndex = data.indexOf(maxValue);
    const maxLabel = chart.data.labels[maxIndex];
    const percentage = ((maxValue / total) * 100).toFixed(1);

    // Clear previous text
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw percentage
    ctx.font = "bold 36px system-ui";
    ctx.fillStyle = "#1e40af";
    ctx.fillText(`${percentage}%`, centerX, centerY - 10);

    // Draw label
    ctx.font = "14px system-ui";
    ctx.fillStyle = "#64748b";
    ctx.fillText(maxLabel, centerX, centerY + 20);

    ctx.restore();
  },
};

const DepartmentDoughnutChart = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeesCache, setEmployeesCache] = useState(null); // lazy cache

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDept, setModalDept] = useState(""); // department label
  const [matched, setMatched] = useState([]); // matched employees
  const [search, setSearch] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/graphs/get_positions.php`);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();

        const labels = data.map((item) => item.department);
        const counts = data.map((item) => item.position_count);

        setChartData({
          labels,
          datasets: [
            {
              label: "Number of Positions",
              data: counts,
              backgroundColor: [
                "#0ea5e9",
                "#06b6d4",
                "#7c3aed",
                "#f97316",
                "#fb7185",
                "#f59e0b",
                "#34d399",
                "#60a5fa",
              ],
              hoverOffset: 8,
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

  // fetch employees once and cache
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

  // open modal for department
  const openModalForDepartment = async (departmentLabel) => {
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
    setMatched(matchedList);
    setSearch("");
    setModalOpen(true);

    // focus input after modal opens
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 120);
  };

  // close modal and restore focus
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // filter matched by search (name / id / position)
  const filteredMatched = matched.filter((emp) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = emp.full_name.toLowerCase();
    const id = String(emp.employee_id ?? "").toLowerCase();
    const pos = String(emp.position_name ?? "").toLowerCase();
    return name.includes(q) || id.includes(q) || pos.includes(q);
  });

  // Enhanced employee card with glassmorphism effect
  const EmployeeCard = ({ emp }) => {
    return (
      <div
        className="group relative bg-slate-100 border border-slate-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden"
        role="button"
        tabIndex={0}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-linear-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <div className="relative flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {emp.image ? (
              <img
                src={emp.image}
                alt={emp.full_name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover ring-2 ring-slate-100 shadow-md group-hover:ring-blue-200 transition-all duration-300"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md">
                <span className="text-gray-400 font-semibold text-base sm:text-lg">
                  {emp.full_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
            )}
            {/* Status indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-slate-100 rounded-full"></div>
          </div>

          {/* Employee Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="font-bold text-gray-900 text-sm sm:text-base truncate group-hover:text-blue-600 transition-colors duration-200">
                {emp.full_name}
              </div>
              <div className="text-xs text-slate-600 bg-slate-200 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-mono ml-2 shrink-0">
                {emp.employee_id}
              </div>
            </div>

            <div className="text-xs sm:text-sm text-gray-700 font-medium mb-1.5 sm:mb-2">
              {emp.position_name || "—"}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="truncate">{emp.branch_name || "—"}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="truncate">{emp.contact_number || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // chart options with center text
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%", // Increased cutout for better center text space
    onClick: (evt, elements) => {
      if (!elements || elements.length === 0) return;
      const el = elements[0];
      const idx = el.index;
      const label = chartData.labels[idx];
      if (label) openModalForDepartment(label);
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          boxWidth: 14,
          padding: 15,
          font: { size: 14, weight: "500", family: "system-ui" },
          color: "#374151",
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (ctx) {
            const v = ctx.raw ?? ctx.parsed;
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((v / total) * 100).toFixed(1);
            return `${ctx.label}: ${v} positions (${percentage}%)`;
          },
        },
      },
      // Register the center text plugin
      centerText: true,
    },
  };

  if (loading)
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="mt-4 text-gray-300 text-sm font-medium animate-pulse">
            Loading department data...
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md text-center">
          <div className="text-red-400 text-4xl mb-3">⚠️</div>
          <div className="text-red-300 font-semibold mb-2">
            Unable to load data
          </div>
          <div className="text-red-400 text-sm">{error}</div>
        </div>
      </div>
    );

  return (
    <div className="w-full flex flex-col items-center justify-center px-2 sm:px-4 py-4 sm:py-6">
      <div className="text-center mb-6 sm:mb-8 px-2">
        <h2 className="text-blue-800 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-2 bg-linear-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
          Department Positions
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm">
          Click on any segment to view department employees
        </p>
      </div>

      <div className="w-full max-w-4xl sm:max-w-5xl">
        <div className="relative group">
          <div className="absolute inset-0 bg-linear-to-r from-blue-500/20 to-indigo-500/20 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl sm:shadow-2xl">
            <div className="w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px] xl:h-[450px]">
              <Doughnut
                data={chartData}
                options={options}
                plugins={[centerTextPlugin]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal (in-DOM, mobile-first) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dept-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          ></div>

          {/* Panel */}
          <div className="relative w-full sm:w-11/12 md:w-10/12 lg:w-9/12 xl:w-[900px] max-h-[95vh] overflow-hidden md:rounded-3xl bg-slate-50 border border-slate-200 shadow-2xl m-2 md:m-4 transform transition-all duration-300 scale-100">
            {/* Gradient Header */}
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-indigo-500 to-indigo-500"></div>

            {/* Header */}
            <div className="flex items-start justify-between gap-2 sm:gap-4 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  <div className="w-2 sm:w-3 h-2 sm:h-3 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                  <h3
                    id="dept-modal-title"
                    className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate"
                  >
                    {modalDept}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {matched.length} Total Employees
                  </span>
                  {search && (
                    <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {filteredMatched.length} Filtered
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="group flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:rotate-90 shrink-0"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 sm:px-6 py-3 sm:py-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ID, or position..."
                  className="w-full pl-10 sm:pl-12 pr-8 sm:pr-4 py-2.5 sm:py-3.5 bg-slate-100 border border-slate-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-slate-500 text-sm sm:text-base"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6 pb-4">
              <div className="overflow-auto max-h-[50vh] sm:max-h-[60vh] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {filteredMatched.length === 0 ? (
                  <div className="text-center py-12 sm:py-16">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                    </div>
                    <div className="text-gray-500 font-medium mb-1 text-sm sm:text-base">
                      No employees found
                    </div>
                    <div className="text-gray-400 text-xs sm:text-sm">
                      Try adjusting your search criteria
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                    {filteredMatched.map((emp) => (
                      <EmployeeCard key={emp.employee_id} emp={emp} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-100 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  Click on an employee card for more options
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDoughnutChart;
