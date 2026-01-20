// src/DepartmentDoughnutChart.js
import React, { useEffect, useState, useRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import BASE_URL from '../../../backend/server/config';

ChartJS.register(ArcElement, Tooltip, Legend);

const DepartmentDoughnutChart = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeesCache, setEmployeesCache] = useState(null); // lazy cache

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDept, setModalDept] = useState(''); // department label
  const [matched, setMatched] = useState([]); // matched employees
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/graphs/get_positions.php`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        const labels = data.map(item => item.department);
        const counts = data.map(item => item.position_count);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Number of Positions',
              data: counts,
              backgroundColor: [
                '#0ea5e9',
                '#06b6d4',
                '#7c3aed',
                '#f97316',
                '#fb7185',
                '#f59e0b',
                '#34d399',
                '#60a5fa',
              ],
              hoverOffset: 8,
            },
          ],
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load');
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
      if (!res.ok) throw new Error('Failed to fetch employees');
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
    const deptLower = String(departmentLabel || '').trim().toLowerCase();

    const matchedList = (Array.isArray(allEmployees) ? allEmployees : [])
      .filter(emp => {
        const deptMatch = String(emp.department_name ?? '').trim().toLowerCase() === deptLower;
        const isActive = String(emp.status ?? '').trim().toLowerCase() === 'active';
        return deptMatch && isActive;
      })
      .map(emp => ({
        ...emp,
        full_name: [emp.first_name, emp.middle_name, emp.last_name]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
      }));

    setModalDept(departmentLabel);
    setMatched(matchedList);
    setSearch('');
    setModalOpen(true);

    // focus input after modal opens
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 120);
  };

  // close modal and restore focus
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // filter matched by search (name / id / position)
  const filteredMatched = matched.filter(emp => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = emp.full_name.toLowerCase();
    const id = String(emp.employee_id ?? '').toLowerCase();
    const pos = String(emp.position_name ?? '').toLowerCase();
    return name.includes(q) || id.includes(q) || pos.includes(q);
  });

  // mobile-friendly card that shows details and a small thumbnail
  const EmployeeCard = ({ emp }) => {
    const imgStyle = 'w-12 h-12 rounded-md object-cover flex-shrink-0';
    return (
      <div
        className="flex items-center gap-3 p-3 bg-white/90 rounded-xl shadow-sm border border-gray-200"
        role="button"
        tabIndex={0}
      >
        {emp.image ? (
          <img src={emp.image} alt={emp.full_name} className={imgStyle} />
        ) : (
          <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">N/A</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-900 truncate">{emp.full_name}</div>
            <div className="text-xs text-gray-500 ml-2">{emp.employee_id}</div>
          </div>
          <div className="text-sm text-gray-600">{emp.position_name || '—'}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <div className="truncate">{emp.branch_name || '—'}</div>
            <div>•</div>
            <div>{emp.contact_number || '—'}</div>
          </div>
        </div>
      </div>
    );
  };

  // chart options (keeps same behavior)
  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 13, weight: '600' },
          color: 'white',
        },
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            const v = ctx.raw ?? ctx.parsed;
            return `${ctx.label}: ${v}`;
          },
        },
      },
    },
  };

  if (loading) return <div className="text-gray-300">Loading...</div>;
  if (error) return <div className="text-red-400">Error: {error}</div>;

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <h2 className="text-white text-lg sm:text-xl md:text-2xl font-semibold mb-3">
        Department Positions
      </h2>

      <div className="w-full max-w-4xl">
        <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] lg:h-[450px] bg-transparent p-2 rounded-xl">
          <Doughnut data={chartData} options={options} />
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
          <div className="relative w-full md:w-[880px] max-h-[92vh] overflow-hidden md:rounded-2xl bg-gray-50 border border-gray-200 shadow-2xl p-4 md:p-6 m-2 md:m-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 id="dept-modal-title" className="text-lg font-bold text-gray-900">
                  {modalDept} — Employees
                </h3>
                <p className="text-sm text-gray-500 mt-1">{matched.length} total • {filteredMatched.length} shown</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setModalOpen(false);
                  }}
                  aria-label="Close"
                  className="text-gray-500 hover:text-gray-700 p-2 rounded-md"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-3">
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID or position..."
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Content */}
            <div className="overflow-auto max-h-[62vh] pr-2">
              {filteredMatched.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No employees found.</div>
              ) : (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {filteredMatched.map((emp) => (
                    <EmployeeCard key={emp.employee_id} emp={emp} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer: action */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-500">Tap an employee to view more (future).</div>
              <div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
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
