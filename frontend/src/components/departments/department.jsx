import { useState, useEffect, useMemo } from "react";
import { CSSTransition } from "react-transition-group";
import DepartmentModal from "./DepartmentModal";
import PositionModal from "./positions/PositionModal";
import "../../../Styles/globals.css";
import "../../../Styles/components/Depertment/department.css";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import { Plus, Search } from "lucide-react";
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { useSession } from "../../context/SessionContext";
import { Tooltip, tooltipClasses } from "@mui/material";
import usePermissions from "../../users/hooks/usePermissions";
import IconButton from "../../../Styles/icons/IconButton";

function ChevronDownIcon({ className = "", size = 18 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChevronUpIcon({ className = "", size = 18 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M18 15l-6-6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DepartmentsAndPositions() {
  const { user } = useSession();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editingPosition, setEditingPosition] = useState(null);
  const [expandedDepartmentId, setExpandedDepartmentId] = useState(null);
  const [positions, setPositions] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [positionsLoading, setPositionsLoading] = useState({});

  const { permissions, loading: permLoading } = usePermissions(user?.username);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/departments/department.php`);
      const data = await res.json();
      setDepartments(data.data || []);
    } catch (err) {
      console.error("Error fetching departments:", err);
      Swal.fire("Error", "Failed to load departments.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchPositions = async (departmentId) => {
    setPositionsLoading((prev) => ({ ...prev, [departmentId]: true }));
    try {
      const res = await fetch(
        `${BASE_URL}/departments/positions/positions.php?department_id=${departmentId}`,
      );
      const data = await res.json();
      setPositions((prev) => ({ ...prev, [departmentId]: data.data || [] }));
    } catch (err) {
      console.error("Error fetching positions:", err);
      setPositions((prev) => ({ ...prev, [departmentId]: [] }));
    } finally {
      setPositionsLoading((prev) => ({ ...prev, [departmentId]: false }));
    }
  };

  const handleViewPositions = (department) => {
    if (expandedDepartmentId === department.department_id) {
      setExpandedDepartmentId(null);
    } else {
      setExpandedDepartmentId(department.department_id);
      fetchPositions(department.department_id);
    }
  };

  const handleAddOrUpdateDepartment = async (newDepartment) => {
    const url = editingDepartment
      ? `${BASE_URL}/departments/update_department.php`
      : `${BASE_URL}/departments/add_department.php`;
    const method = editingDepartment ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDepartment),
      });
      const data = await res.json();
      if (data.success || data.status === "success") {
        await Swal.fire(
          "Success!",
          "Department saved successfully.",
          "success",
        );
        setIsDepartmentModalOpen(false);
        setEditingDepartment(null);
        fetchDepartments();
      } else {
        await Swal.fire(
          "Error!",
          data.message || "Failed to save department.",
          "error",
        );
      }
    } catch {
      await Swal.fire("Error!", "Unable to save department.", "error");
    }
  };

  const handleEditDepartment = (dept) => {
    setEditingDepartment(dept);
    setIsDepartmentModalOpen(true);
  };

  const handleDeleteDepartment = async (id) => {
    const ret = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the department.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (!ret.isConfirmed) return;

    try {
      const res = await fetch(
        `${BASE_URL}/departments/delete_department.php?id=${id}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (data.status === "success") {
        await Swal.fire("Deleted!", "Department removed.", "success");
        fetchDepartments();
      } else {
        await Swal.fire("Error!", data.message || "Failed to delete.", "error");
      }
    } catch {
      await Swal.fire("Error!", "Server error deleting department.", "error");
    }
  };

  const handleAddOrUpdatePosition = async (newPosition) => {
    const payload = editingPosition
      ? {
          position_id: editingPosition.position_id,
          new_position_id:
            newPosition.position_id || editingPosition.position_id,
          position_name: newPosition.position_name,
          department_id: expandedDepartmentId,
        }
      : {
          position_id: newPosition.position_id,
          position_name: newPosition.position_name,
          department_id: expandedDepartmentId,
        };

    const url = editingPosition
      ? `${BASE_URL}/departments/positions/update_positions.php`
      : `${BASE_URL}/departments/positions/add_positions.php`;
    const method = editingPosition ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === "success") {
        await Swal.fire("Success!", "Position saved successfully.", "success");
        setIsPositionModalOpen(false);
        setEditingPosition(null);
        fetchPositions(expandedDepartmentId);
      } else {
        await Swal.fire(
          "Error!",
          data.message || "Failed to save position.",
          "error",
        );
      }
    } catch {
      await Swal.fire("Error!", "Server error saving position.", "error");
    }
  };

  const handleEditPosition = (pos) => {
    setEditingPosition(pos);
    setIsPositionModalOpen(true);
  };

  const handleDeletePosition = async (position_id) => {
    const ret = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the position.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });
    if (!ret.isConfirmed) return;

    try {
      const res = await fetch(
        `${BASE_URL}/departments/positions/delete_positions.php?id=${position_id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.status === "success") {
        await Swal.fire("Deleted!", "Position removed.", "success");
        fetchPositions(expandedDepartmentId);
      } else {
        await Swal.fire(
          "Error!",
          data.message || "Failed to delete position.",
          "error",
        );
      }
    } catch {
      await Swal.fire("Error!", "Server error deleting position.", "error");
    }
  };

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      (d.department_name || "").toLowerCase().includes(q),
    );
  }, [departments, searchQuery]);

  const breadcrumbItems = [
    !permLoading &&
      permissions?.employee_list && {
        key: "dashboard",
        label: "Employee Lists",
        path: "/employees",
      },
    !permLoading &&
      permissions?.department && {
        key: "employees",
        label: "Departments",
        path: "/department",
      },
    !permLoading &&
      permissions?.branches && {
        key: "branches",
        label: "Branches",
        path: "/branches",
      },
  ].filter(Boolean);

  // --- NEW: calculate how much bottom padding we need ---
  const expandedPositionsCount = expandedDepartmentId
    ? positions[expandedDepartmentId]?.length || 0
    : 0;

  // heuristics — tweak numbers if you want:
  // - small lists: normal padding
  // - medium lists (>5): extra padding so last items clear bottom menu
  // - large lists (>10) or when PositionModal open: big padding
  const bottomPaddingClass = isPositionModalOpen
    ? "pb-[260px]"
    : expandedPositionsCount > 10
      ? "pb-[260px]"
      : expandedPositionsCount > 5
        ? "pb-[160px]"
        : "pb-20";

  return (
    <div
      className={`container flex flex-col gap-y-4 px-4 sm:px-6 transition-all duration-200 ${bottomPaddingClass}`}
    >
      {/* Solid breadcrumb/header — not transparent */}
      <div className="sticky top-0 z-10 flex flex-col w-full pb-3 pl-0 sm:pl-5 border-b bg-white shadow-sm">
        <div className="py-3">
          <span className="text-2xl font-semibold">
            Departments and Positions
          </span>
        </div>
        <div className="hidden sm:block">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex flex-wrap justify-between items-center px-2 sm:px-0 mt-4 mb-2 gap-3">
        <div className="relative flex-grow max-w-[900px]">
          <input
            type="text"
            placeholder="Search by department name..."
            className="w-full h-10 pl-10 pr-3 rounded-lg shadow-inner nb-department-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <Search size={18} />
          </div>
        </div>

        {!permLoading && permissions?.can_add && (
          <Tooltip
            title="Add Department"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                    { marginTop: "7px", backgroundColor: "#46494c" },
                },
              },
            }}
          >
            <button
              onClick={() => {
                setEditingDepartment(null);
                setIsDepartmentModalOpen(true);
              }}
              title="Add Department"
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              <Plus size={20} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Department List */}
      <div className="grid gap-3 p-3">
        {loading ? (
          <div className="py-12 text-center text-gray-600">
            Loading departments...
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-8 text-center text-gray-600">
            No departments found.
          </div>
        ) : (
          filteredDepartments.map((department) => {
            const deptPositions = positions[department.department_id] || [];
            const isExpanded =
              expandedDepartmentId === department.department_id;
            const deptLoading = !!positionsLoading[department.department_id];

            return (
              <div key={department.department_id} className="p-0">
                <div
                  className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer"
                  onClick={() => handleViewPositions(department)}
                >
                  <div className="flex-1 text-left min-w-0">
                    <h2 className="text-lg font-semibold text-gray-800 truncate">
                      {department.department_name}
                    </h2>
                  </div>

                  <div
                    className="flex items-center gap-2 ml-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!permLoading && permissions?.can_edit && (
                      <IconButton
                        title="Edit"
                        variant="edit"
                        onClick={() => handleEditDepartment(department)}
                      />
                    )}
                    {!permLoading && permissions?.can_delete && (
                      <IconButton
                        title="Delete"
                        variant="delete"
                        onClick={() =>
                          handleDeleteDepartment(department.department_id)
                        }
                      />
                    )}
                    <button
                      aria-label={
                        isExpanded ? "Collapse positions" : "Expand positions"
                      }
                      onClick={() => handleViewPositions(department)}
                      className="p-2 rounded-md hover:bg-gray-100"
                    >
                      {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    </button>
                  </div>
                </div>

                {/* Expanded Positions */}
                <CSSTransition
                  in={isExpanded}
                  timeout={260}
                  classNames="position-dropdown"
                  unmountOnExit
                >
                  <div
                    className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm"
                    // make the expanded area independently scrollable so long lists don't grow the page indefinitely
                    style={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      paddingBottom: 20,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800">
                        Positions for {department.department_name}
                      </h3>

                      {!permLoading && permissions?.can_add && (
                        <Tooltip
                          title="Add Position"
                          placement="bottom"
                          slotProps={{
                            popper: {
                              sx: {
                                [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                                  {
                                    marginTop: "7px",
                                    backgroundColor: "#46494c",
                                  },
                              },
                            },
                          }}
                        >
                          <button
                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                            onClick={() => {
                              setEditingPosition(null);
                              setIsPositionModalOpen(true);
                            }}
                          >
                            <Plus size={20} />
                          </button>
                        </Tooltip>
                      )}
                    </div>

                    {/* Show loading text while positions are fetching for this dept */}
                    {deptLoading ? (
                      <p className="text-center text-gray-500 py-3 italic">
                        Loading positions...
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {deptPositions.length > 0 ? (
                          deptPositions.map((position) => (
                            <div
                              key={position.position_id}
                              className="flex items-center justify-between bg-white p-3 rounded-md border hover:bg-gray-50"
                            >
                              {/* name: allow wrapping by word, keep min-w-0 so it doesn't push actions */}
                              <span className="font-medium text-gray-700 text-left flex-1 min-w-0 break-words">
                                {position.position_name}
                              </span>

                              {/* actions (always right) */}
                              <div className="flex items-center gap-2 ml-4">
                                {!permLoading && permissions?.can_edit && (
                                  <IconButton
                                    title="Edit"
                                    variant="edit"
                                    onClick={() => handleEditPosition(position)}
                                  />
                                )}
                                {!permLoading && permissions?.can_delete && (
                                  <IconButton
                                    title="Delete"
                                    variant="delete"
                                    onClick={() =>
                                      handleDeletePosition(position.position_id)
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-gray-500 text-sm">
                            No positions found.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CSSTransition>
              </div>
            );
          })
        )}
      </div>

      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => {
          setIsDepartmentModalOpen(false);
          setEditingDepartment(null);
        }}
        onSubmit={handleAddOrUpdateDepartment}
        department={editingDepartment}
        existingDepartmentIds={departments.map((d) => d.department_id)}
      />

      <PositionModal
        isOpen={isPositionModalOpen}
        onClose={() => {
          setIsPositionModalOpen(false);
          setEditingPosition(null);
        }}
        onSubmit={handleAddOrUpdatePosition}
        position={editingPosition}
        departmentId={expandedDepartmentId}
        departmentName={
          departments.find((d) => d.department_id === expandedDepartmentId)
            ?.department_name
        }
        existingPositions={positions[expandedDepartmentId] || []}
      />

      <style>{`
        .position-dropdown-enter {
          opacity: 0;
          transform: translateY(-6px);
          max-height: 0;
        }
        .position-dropdown-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 260ms ease, transform 260ms ease, max-height 260ms ease;
          max-height: 1200px;
        }
        .position-dropdown-exit {
          opacity: 1;
          transform: translateY(0);
          max-height: 1200px;
        }
        .position-dropdown-exit-active {
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 220ms ease, transform 220ms ease, max-height 220ms ease;
          max-height: 0;
        }
      `}</style>
    </div>
  );
}
