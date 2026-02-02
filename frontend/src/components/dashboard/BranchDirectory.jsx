import React, { useEffect, useMemo, useState } from "react";
import BASE_URL from "../../../backend/server/config";
import { X, MapPin, Users, Building2, Search, ArrowRight } from "lucide-react";

/**
 * BranchDirectory.jsx
 * - 2-column scrollable branch list
 * - Professional & Elegant UI Overhaul
 */

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm animate-pulse min-h-[140px]">
      <div className="flex justify-between items-start mb-4">
        <div className="h-5 w-1/2 bg-gray-200 rounded" />
        <div className="h-6 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="h-3 w-3/4 bg-gray-100 rounded mb-6" />
      <div className="flex items-center justify-between mt-auto">
        <div className="flex -space-x-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white" />
          <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white" />
        </div>
        <div className="h-3 w-12 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// Enhanced Avatar Stack
function AvatarPile({ items = [], names = [], size = 8, max = 3 }) {
  const slice = items.slice(0, max);
  const displayNames = names.slice(0, max);

  return (
    <div className="flex -space-x-2.5 items-center">
      {slice.map((it, idx) =>
        it ? (
          <img
            key={idx}
            src={it}
            alt=""
            className={`w-${size} h-${size} rounded-full object-cover border-[3px] border-white shadow-sm bg-gray-100`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/dist/images/default-avatar.png";
            }}
          />
        ) : (
          <div
            key={idx}
            className={`w-${size} h-${size} rounded-full bg-linear-to-br from-blue-500 to-blue-600 text-[10px] font-bold text-white flex items-center justify-center border-[3px] border-white shadow-sm`}
          >
            {displayNames[idx]
              ? `${displayNames[idx][0]}${displayNames[idx].split(" ").slice(-1)[0][0] || ""}`.toUpperCase()
              : "?"}
          </div>
        ),
      )}

      {items.length > max && (
        <div
          className={`w-${size} h-${size} rounded-full bg-gray-100 text-[10px] font-bold text-gray-500 flex items-center justify-center border-[3px] border-white shadow-sm`}
        >
          +{items.length - max}
        </div>
      )}
    </div>
  );
}

export default function BranchDirectory() {
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [branchRes, empRes] = await Promise.all([
          fetch(`${BASE_URL}/branches/get_branch.php`),
          fetch(`${BASE_URL}/employeesSide/employees.php`),
        ]);
        const branchJson = await branchRes.json();
        const empJson = await empRes.json();

        if (!mounted) return;

        setBranches(
          Array.isArray(branchJson) ? branchJson : branchJson.data || [],
        );
        setEmployees(Array.isArray(empJson) ? empJson : empJson.data || []);
      } catch (err) {
        console.error("Error fetching branches/employees:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelectedBranch(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resolveImage = (img) => {
    if (!img) return null;
    const s = String(img).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("/")) return s;
    return `${BASE_URL}/images/${s}`;
  };

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => (b.name || "").toLowerCase().includes(q));
  }, [branches, branchSearch]);

  const empMap = useMemo(() => {
    const map = new Map();
    for (const e of employees) {
      const k = (e.branch_name || "").toLowerCase().trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    return map;
  }, [employees]);

  const branchEmployees = useMemo(() => {
    if (!selectedBranch) return [];
    const k = (selectedBranch.name || "").toLowerCase().trim();
    return empMap.get(k) || [];
  }, [selectedBranch, empMap]);

  const filteredModalEmployees = useMemo(() => {
    if (!modalSearch) return branchEmployees;
    const q = modalSearch.toLowerCase();
    return branchEmployees.filter((emp) => {
      const name =
        `${emp.first_name || ""} ${emp.middle_name || ""} ${emp.last_name || ""}`.toLowerCase();
      return (
        (emp.employee_id || "").toLowerCase().includes(q) ||
        name.includes(q) ||
        (emp.position_name || "").toLowerCase().includes(q)
      );
    });
  }, [branchEmployees, modalSearch]);

  const employeeCountFor = (branch) => {
    const k = (branch.name || "").toLowerCase().trim();
    return (empMap.get(k) || []).length;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-gray-950 text-white rounded-3xl p-4 sm:p-6 lg:p-8">
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-linear-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Branch Directory
                </h3>
              </div>
              <div className="text-sm text-gray-400 ml-14">
                Loading branches...
              </div>
            </div>
            <div className="w-full sm:w-64">
              <div className="h-11 bg-gray-800 rounded-xl animate-pulse" />
            </div>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mt-6"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* --- Header Section --- */}
      <div className="px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="text-blue-600 w-5 h-5" />
              <h3 className="text-xl font-bold text-gray-800 tracking-tight">
                Branch Directory
              </h3>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {branches.length} active locations • {employees.length} total
              staff
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Find a branch..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* --- Scrollable Content --- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredBranches.length === 0 ? (
            <div className="col-span-1 lg:col-span-2 py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-semibold">No branches found</h3>
              <p className="text-gray-500 text-sm mt-1">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            filteredBranches.map((branch) => {
              const count = employeeCountFor(branch);
              const emps =
                empMap.get((branch.name || "").toLowerCase().trim()) || [];
              const avatars = emps
                .slice(0, 6)
                .map((e) => resolveImage(e.image));
              const names = emps.map((e) => `${e.first_name} ${e.last_name}`);

              return (
                <button
                  key={branch.branch_id}
                  onClick={() => {
                    setModalSearch("");
                    setSelectedBranch(branch);
                  }}
                  className="group flex flex-col justify-between text-left w-full bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Card Header */}
                  <div className="w-full mb-4">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <h4 className="text-base font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {branch.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold border border-gray-200 uppercase tracking-wide">
                        #{branch.branch_id}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-gray-500 min-h-8">
                      <MapPin
                        size={14}
                        className="mt-0.5 text-gray-400 shrink-0"
                      />
                      <span className="line-clamp-2 leading-relaxed">
                        {branch.address || "No address provided"}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="w-full pt-4 border-t border-gray-100 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">
                        Team Members
                      </p>
                      <div className="flex items-center gap-3">
                        <AvatarPile
                          items={avatars}
                          names={names}
                          size={8}
                          max={3}
                        />
                        {count === 0 && (
                          <span className="text-xs text-gray-400 italic">
                            No Staff
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <span>Details</span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* --- Modal Overlay --- */}
      {selectedBranch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedBranch(null)}
        >
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 bg-white rounded-t-2xl z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedBranch.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                    <MapPin size={15} />
                    <span>{selectedBranch.address || "Address not set"}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee in this branch..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-100 text-gray-700"
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              <div className="px-2 py-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                  {filteredModalEmployees.length} Active Staff
                </div>

                {filteredModalEmployees.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">No employees found.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredModalEmployees.map((emp) => (
                      <div
                        key={emp.employee_id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {emp.image ? (
                            <img
                              src={resolveImage(emp.image)}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "/dist/images/default-avatar.png";
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-100">
                              {`${(emp.first_name?.[0] || "").toUpperCase()}${(emp.last_name?.[0] || "").toUpperCase()}`}
                            </div>
                          )}
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {emp.first_name} {emp.middle_name || ""}{" "}
                              {emp.last_name}
                            </h4>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                              {emp.employee_id}
                            </span>
                          </div>
                          <p className="text-xs text-blue-600 font-medium truncate mb-0.5">
                            {emp.position_name || "No Position"}
                          </p>
                          {emp.email && (
                            <p className="text-[11px] text-gray-400 truncate">
                              {emp.email}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl text-right">
              <span className="text-xs text-gray-400 mr-2">
                Press ESC to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
