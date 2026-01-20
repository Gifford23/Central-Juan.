// employeeListView.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { UserRound } from "lucide-react";
import { Tooltip } from "@mui/material";
import EmployeeActionsDropdown from "../employeeComponents/EmployeeActionDropdown";
import EmployeeTypeBadge from "../employeeComponents/EmployeeTypebadge";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions";
import { FixedSizeList as List, FixedSizeGrid as Grid } from "react-window";
import PropTypes from "prop-types";

/**
 * Virtualized EmployeeListView
 *
 * Props:
 * - loading
 * - filteredEmployees
 * - selectedEmployees
 * - handleSelectAll
 * - handleSelectEmployee
 * - handleEditEmployee
 * - handleDeleteEmployee
 * - handleToggleStatus
 *
 * Notes:
 * - Uses react-window for windowing (virtualization). Install: npm/yarn add react-window
 * - Desktop: fixed height rows (fast rendering for thousands)
 * - Mobile/tablet: responsive virtualized grid
 */

const DEFAULT_ROW_HEIGHT = 150; // approximate height for each desktop row (tweak if needed)
const MOBILE_CARD_HEIGHT = 320; // height for each mobile card in grid
const MOBILE_BREAKPOINT = 1024; // px at or above this we treat as 'desktop'

const useWindowSize = () => {
  const [size, setSize] = useState({ width: typeof window !== "undefined" ? window.innerWidth : 1200, height: typeof window !== "undefined" ? window.innerHeight : 800 });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
};

const DesktopRow = ({ index, style, data }) => {
  const {
    items,
    selectedEmployees,
    handleSelectEmployee,
    handleEditEmployee,
    handleDeleteEmployee,
    handleToggleStatus,
    permLoading,
    permissions,
  } = data;

  const employee = items[index];
  if (!employee) return null;

  const isSelected = selectedEmployees.includes(employee.employee_id);

  const fullName = `${employee.first_name || ""} ${employee.middle_name || ""} ${employee.last_name || ""}`.replace(/\s+/g, " ").trim();

  return (
    <div style={style} className="px-2">
      <article
        className="flex items-start gap-6 p-5 rounded-2xl bg-white shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5"
        role="listitem"
        aria-label={`Employee ${employee.employee_id}`}
      >
        {/* left: checkbox + avatar + name stacked and top-aligned */}
        <div className="flex-shrink-0 min-w-[320px] max-w-[420px]">
          <div className="flex items-start gap-4">
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectEmployee(employee.employee_id)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                aria-label={`select ${employee.employee_id}`}
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-16 h-16 overflow-hidden bg-white rounded-full ring-1 ring-slate-100">
                {employee.image ? (
                  <img src={employee.image} alt="Employee" className="object-cover w-full h-full" />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-indigo-400 bg-gray-100">
                    <UserRound />
                  </div>
                )}
              </div>

              <div className="min-w-0 w-[220px]">
                <h3 className="text-sm font-semibold leading-snug break-words whitespace-normal">
                  <Tooltip title={fullName}>
                    <span className="block">{fullName || "N/A"}</span>
                  </Tooltip>
                </h3>

                <div className="mt-1 text-xs text-gray-600 break-words whitespace-normal">
                  <Tooltip
                    title={
                      <div>
                        <div>
                          <strong>User ID:</strong> {employee.employee_id || "N/A"}
                        </div>
                        <div>
                          <strong>Biometrics ID:</strong> {employee.custom_user_id || "N/A"}
                        </div>
                      </div>
                    }
                  >
                    <div className="flex flex-col space-y-0.5">
                      <span className="flex items-center">
                        <span className="font-medium text-gray-700">User ID:</span>&nbsp;
                        {employee.employee_id || "N/A"}
                      </span>

                      <span className="flex items-center">
                        <span className="font-medium text-gray-700">Biometrics ID:</span>&nbsp;
                        {employee.custom_user_id || "N/A"}
                      </span>
                    </div>
                  </Tooltip>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${employee.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                    {employee.status === "active" ? "Active" : "Inactive"}
                  </span>

                  <EmployeeTypeBadge type={employee.employee_type} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* center: flexible info area (wraps) */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex-1 min-w-[160px] max-w-[520px]">
              <div className="text-xs text-gray-400">Branch</div>
              <Tooltip title={employee.branch_name || "Not assigned"}>
                <div className="text-sm font-medium break-words whitespace-normal">{employee.branch_name || "Not assigned"}</div>
              </Tooltip>

              <div className="mt-2 text-xs text-gray-400">Email</div>
              <Tooltip title={employee.email || "N/A"}>
                <div className="text-sm break-words whitespace-normal">{employee.email || "N/A"}</div>
              </Tooltip>
            </div>

            <div className="flex-1 min-w-[160px] max-w-[420px]">
              <div className="text-xs text-gray-400">Department</div>
              <Tooltip title={employee.department_name || "N/A"}>
                <div className="text-sm font-medium break-words whitespace-normal">{employee.department_name || "N/A"}</div>
              </Tooltip>

              <div className="mt-2 text-xs text-gray-400">Date of Birth</div>
              <Tooltip title={employee.date_of_birth || "N/A"}>
                <div className="text-sm break-words whitespace-normal">
                  {employee.date_of_birth && employee.date_of_birth !== "N/A"
                    ? new Date(employee.date_of_birth).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </div>
              </Tooltip>
            </div>

            <div className="flex-1 min-w-[160px] max-w-[420px]">
              <div className="text-xs text-gray-400">Position</div>
              <Tooltip title={employee.position_name || "N/A"}>
                <div className="text-sm font-medium break-words whitespace-normal">{employee.position_name || "N/A"}</div>
              </Tooltip>

              <div className="mt-2 text-xs text-gray-400">Password</div>
              <div className="text-sm break-words whitespace-normal">{!permLoading && permissions?.can_view ? employee.password || "N/A" : "—"}</div>
            </div>

            <div className="flex-1 min-w-[220px] max-w-[640px]">
              <div className="text-xs text-gray-400">Contact</div>
              <Tooltip title={employee.contact_number || "N/A"}>
                <div className="text-sm break-words whitespace-normal">{employee.contact_number || "N/A"}</div>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* right: rates + actions (keeps fixed width so actions stay visible) */}
        <div className="flex flex-col items-end gap-3 min-w-[220px]">
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-400">Daily</div>
              <div className="text-sm font-medium break-words whitespace-normal">{!permLoading && permissions?.can_view ? employee.base_salary || "N/A" : "—"}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">Monthly</div>
              <div className="text-sm font-medium break-words whitespace-normal">{!permLoading && permissions?.can_view ? employee.monthly_rate || "N/A" : "—"}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">Hourly</div>
              <div className="text-sm font-medium break-words whitespace-normal">{!permLoading && permissions?.can_view ? employee.hourly_rate || "N/A" : "—"}</div>
            </div>
          </div>

          <div>
            {!permLoading && permissions?.can_edit && (
              <EmployeeActionsDropdown employee={employee} onEdit={handleEditEmployee} onDelete={handleDeleteEmployee} onToggleStatus={handleToggleStatus} />
            )}
          </div>
        </div>
      </article>
    </div>
  );
};

const MobileCard = ({ employee, permLoading, permissions, handleEditEmployee, handleDeleteEmployee, handleToggleStatus, selectedEmployees, handleSelectEmployee }) => {
  return (
    <div className="p-4 transition bg-white border shadow-sm rounded-xl hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-16 h-16 overflow-hidden bg-white rounded-full ring-1 ring-slate-100">
          {employee.image ? (
            <img src={employee.image} alt="Emp" className="object-cover w-full h-full" />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-indigo-400 bg-gray-100">
              <UserRound />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-snug break-words whitespace-normal" title={`${employee.first_name} ${employee.middle_name || ""} ${employee.last_name || ""}`}>
                {employee.first_name} {employee.last_name}
              </div>
              <div className="text-xs text-gray-400 break-words whitespace-normal">ID: {employee.employee_id}</div>
            </div>

            <div className="text-right">
              <div className={`text-xs px-2 py-0.5 rounded-full font-semibold ${employee.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                {employee.status === "active" ? "Active" : "Inactive"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <EmployeeTypeBadge type={employee.employee_type} />
            {!permLoading && permissions?.can_view && <div className="text-sm font-medium break-words whitespace-normal">{employee.base_salary || "N/A"}</div>}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1 text-sm text-gray-700 break-words whitespace-normal">
        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={selectedEmployees.includes(employee.employee_id)} onChange={() => handleSelectEmployee(employee.employee_id)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
            <span className="text-xs">Select</span>
          </label>
        </div>
        <div>
          <strong>Dept:</strong> {employee.department_name || "N/A"}
        </div>
        <div>
          <strong>Position:</strong> {employee.position_name || "N/A"}
        </div>
        <div>
          <strong>Email:</strong> {employee.email || "N/A"}
        </div>
        <div>
          <strong>Contact:</strong> {employee.contact_number || "N/A"}
        </div>
        <div>
          <strong>DOB:</strong>{" "}
          {employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A"}
        </div>

        {!permLoading && permissions?.can_edit && (
          <div className="flex justify-end mt-2">
            <EmployeeActionsDropdown employee={employee} onEdit={handleEditEmployee} onDelete={handleDeleteEmployee} onToggleStatus={handleToggleStatus} />
          </div>
        )}
      </div>
    </div>
  );
};

const EmployeeListView = ({
  loading,
  filteredEmployees,
  selectedEmployees,
  handleSelectAll,
  handleSelectEmployee,
  handleEditEmployee,
  handleDeleteEmployee,
  handleToggleStatus,
}) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const windowSize = useWindowSize();
  const isDesktop = windowSize.width >= MOBILE_BREAKPOINT;

  // simple local filters on top of passed filteredEmployees
  const filteredData = useMemo(() => {
    return filteredEmployees
      .filter((emp) => {
        if (statusFilter !== "all" && emp.status !== statusFilter) return false;
        if (typeFilter !== "all" && emp.employee_type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return 0;
      });
  }, [filteredEmployees, statusFilter, typeFilter]);

  // react-window data objects
  const listRef = useRef(null);
  const itemData = useMemo(
    () => ({
      items: filteredData,
      selectedEmployees,
      handleSelectEmployee,
      handleEditEmployee,
      handleDeleteEmployee,
      handleToggleStatus,
      permLoading,
      permissions,
    }),
    [filteredData, selectedEmployees, handleSelectEmployee, handleEditEmployee, handleDeleteEmployee, handleToggleStatus, permLoading, permissions]
  );

  // grid settings for mobile
  const [gridColumnCount, setGridColumnCount] = useState(1);
  useEffect(() => {
    if (!isDesktop) {
      const w = windowSize.width;
      if (w < 640) setGridColumnCount(1);
      else if (w < 900) setGridColumnCount(2);
      else setGridColumnCount(3);
    }
  }, [windowSize.width, isDesktop]);

  // quick skeleton generator for loading overlay
  const SkeletonRows = () => {
    const count = isDesktop ? 6 : 4;
    return (
      <div className={`w-full ${isDesktop ? "" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-lg shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded" />
                <div className="w-1/2 h-3 bg-gray-200 rounded" />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="w-full h-3 bg-gray-200 rounded" />
              <div className="w-5/6 h-3 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Renderers for react-window Grid
  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const { items, permLoading: pl, permissions: perms } = data;
    const index = rowIndex * gridColumnCount + columnIndex;
    const employee = items[index];
    if (!employee) return null;

    return (
      <div style={style} className="p-2">
        <MobileCard
          employee={employee}
          permLoading={pl}
          permissions={perms}
          handleEditEmployee={handleEditEmployee}
          handleDeleteEmployee={handleDeleteEmployee}
          handleToggleStatus={handleToggleStatus}
          selectedEmployees={selectedEmployees}
          handleSelectEmployee={handleSelectEmployee}
        />
      </div>
    );
  };

  // Desktop row renderer wrapper
  const Row = useCallback(
    ({ index, style }) => <DesktopRow index={index} style={style} data={itemData} />,
    [itemData]
  );

  // if large lists, give the list a fixed height; otherwise the container grows — choose a max height
  const listHeight = Math.min(windowSize.height - 300, 800); // keep it reasonable

  return (
    <>
      {/* Header / Controls */}
      <div className="flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              data-tooltip-id="Checkbox-employee"
              data-tooltip-content="Select All"
              data-tooltip-place="top"
              type="checkbox"
              onChange={handleSelectAll}
              checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Select all</span>
          </label>

          <div className="px-3 py-1 text-sm font-semibold text-indigo-700 rounded-full bg-indigo-50">
            {filteredData.length} employees
          </div>
        </div>

        {/* (Optional) Local filter controls kept commented originally; re-enable if desired */}
        <div className="items-center hidden gap-2 sm:flex">
          {/* small inline filters (optional) */}
          {/* <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} ...>... */}
        </div>
      </div>

      {/* Main content area */}
      <div className="relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/90">
            <div className="flex flex-col items-center gap-4">
              <svg className="w-12 h-12 animate-spin" viewBox="0 0 50 50" aria-hidden="true">
                <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" stroke="currentColor" strokeOpacity="0.15" />
                <path d="M45 25a20 20 0 0 1-20 20" fill="none" strokeWidth="5" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <div className="text-sm text-gray-600">Loading employees…</div>
            </div>
          </div>
        )}

        {/* If loading, show skeletons (keeps layout) */}
        {loading ? (
          <div className="mt-3">
            <SkeletonRows />
          </div>
        ) : (
          <>
            {/* Desktop virtualized list */}
            {isDesktop ? (
              <div className="hidden lg:block">
                {filteredData.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-500">
                    <UserRound size={36} className="text-gray-300" />
                    <div className="text-sm">No employees found.</div>
                  </div>
                ) : (
                  <div>
                    <List
                      height={listHeight}
                      itemCount={filteredData.length}
                      itemSize={DEFAULT_ROW_HEIGHT}
                      width="100%"
                      itemData={itemData}
                      ref={listRef}
                      overscanCount={8}
                    >
                      {Row}
                    </List>
                  </div>
                )}
              </div>
            ) : (
              // Mobile / Tablet virtualized grid
              <div className="lg:hidden">
                {filteredData.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-500">
                    <UserRound size={36} className="text-gray-300" />
                    <div className="text-sm">No employees found.</div>
                  </div>
                ) : (
                  <div>
                    <Grid
                      columnCount={gridColumnCount}
                      columnWidth={Math.floor(windowSize.width / gridColumnCount)}
                      height={Math.min(windowSize.height - 220, 900)}
                      rowCount={Math.ceil(filteredData.length / gridColumnCount)}
                      rowHeight={MOBILE_CARD_HEIGHT}
                      width={windowSize.width}
                      itemData={{ items: filteredData, permLoading, permissions }}
                      overscanRowCount={2}
                    >
                      {Cell}
                    </Grid>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

EmployeeListView.propTypes = {
  loading: PropTypes.bool,
  filteredEmployees: PropTypes.array,
  selectedEmployees: PropTypes.array,
  handleSelectAll: PropTypes.func,
  handleSelectEmployee: PropTypes.func,
  handleEditEmployee: PropTypes.func,
  handleDeleteEmployee: PropTypes.func,
  handleToggleStatus: PropTypes.func,
};

EmployeeListView.defaultProps = {
  loading: false,
  filteredEmployees: [],
  selectedEmployees: [],
  handleSelectAll: () => {},
  handleSelectEmployee: () => {},
  handleEditEmployee: () => {},
  handleDeleteEmployee: () => {},
  handleToggleStatus: () => {},
};

export default EmployeeListView;
