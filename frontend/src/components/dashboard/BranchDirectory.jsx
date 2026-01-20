import React, { useEffect, useMemo, useState } from "react";
import BASE_URL from "../../../backend/server/config";
import { X, MapPin, Users } from "lucide-react";

/**
 * BranchDirectory.jsx
 * - 2-column scrollable branch list
 * - full width on mobile
 * - initials shown if image is null
 */

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-gray-800/60 border border-gray-700 p-5 min-h-[120px]">
      <div className="h-5 w-3/4 bg-gray-700 rounded mb-3" />
      <div className="h-4 w-1/2 bg-gray-700 rounded mb-4" />
      <div className="h-px bg-gray-700/60 my-2" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-gray-700 rounded" />
        <div className="h-4 w-12 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

// avatar stack
function AvatarPile({ items = [], names = [], size = 2, max = 2 }) {
  const slice = items.slice(0, max);
  const displayNames = names.slice(0, max);

  return (
    <div className="flex -space-x-2 items-center">
      {slice.map((it, idx) =>
        it ? (
          <img
            key={idx}
            src={it}
            alt=""
            className={`w-${size} h-${size} rounded-full object-cover border-2 border-gray-900 bg-gray-200`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/dist/images/default-avatar.png";
            }}
          />
        ) : (
          <div
            key={idx}
            className={`w-${size} h-${size} rounded-full bg-gray-700 text-xs text-white flex items-center justify-center border-2 border-gray-900`}
          >
            {displayNames[idx]
              ? `${displayNames[idx][0]}${displayNames[idx].split(" ").slice(-1)[0][0] || ""}`.toUpperCase()
              : "?"}
          </div>
        )
      )}

      {items.length > max && (
        <div className={`w-${size} h-${size} rounded-full bg-gray-700 text-xs text-white flex items-center justify-center border-2 border-gray-900`}>
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
        setBranches(Array.isArray(branchJson) ? branchJson : branchJson.data || []);
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
      const name = `${emp.first_name || ""} ${emp.middle_name || ""} ${emp.last_name || ""}`.toLowerCase();
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
      <div className="w-full">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">🏢 Branch Directory</h3>
              <div className="text-xs text-gray-300">Loading branches...</div>
            </div>
            <div className="w-48">
              <div className="h-9 bg-gray-800 rounded-lg" />
            </div>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4 pr-2"
            style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: "0.25rem" }}
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
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white rounded-3xl p-4 sm:p-6">
        <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 sticky top-0 bg-gradient-to-b from-gray-950/90 to-transparent backdrop-blur-sm py-2 z-20 px-2 sm:px-0 rounded-2xl">
            <div>
            <h3 className="text-lg font-semibold">🏢 Branch Directory</h3>
            <div className="text-xs text-gray-300">{branches.length} branches</div>
            </div>

            <div className="w-48">
            <input
                type="text"
                placeholder="Search branch..."
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-gray-200 placeholder-gray-400 outline-none border border-gray-700 focus:ring-2 focus:ring-blue-500"
            />
            </div>
        </div>

        {/* Branch Grid */}
        <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4 pr-2 sm:pr-0 w-full sm:w-auto rounded-3xl"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
        >
            {filteredBranches.length === 0 ? (
            <div className="col-span-1 sm:col-span-2 p-6 rounded-3xl bg-gray-800 border border-gray-700 text-center text-gray-300">
                No branches match your search.
            </div>
            ) : (
            filteredBranches.map((branch) => {
                const count = employeeCountFor(branch);
                const emps = empMap.get((branch.name || "").toLowerCase().trim()) || [];
                const avatars = emps.slice(0, 6).map((e) => resolveImage(e.image));
                const names = emps.map((e) => `${e.first_name} ${e.last_name}`);

                return (
                <button
                    key={branch.branch_id}
                    type="button"
                    onClick={() => {
                    setModalSearch("");
                    setSelectedBranch(branch);
                    }}
                    className="group relative text-left w-full rounded-3xl bg-gradient-to-br from-gray-800/80 to-gray-900 border border-gray-700 
                            p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[140px]"
                >
                    <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-white truncate">{branch.name}</h4>
                        <div className="flex items-center gap-3 mt-2">
                        <div className="inline-flex items-center text-sm text-gray-400">
                            <MapPin size={14} className="mr-1" />
                            <span className="truncate max-w-[18rem]">{branch.address || "No address provided"}</span>
                        </div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-lg">#{branch.branch_id}</div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AvatarPile items={avatars} names={names} size={8} max={1} />
                        <div className="text-sm">
                        <div className="text-white text-sm font-medium">{count}</div>
                        <div className="text-xs text-gray-400">employees</div>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-sm text-gray-400">
                        <Users size={14} />
                        <span className="text-blue-300 group-hover:text-blue-200 transition">View</span>
                    </div>
                    </div>
                </button>
                );
            })
            )}
        </div>
        </div>

        {/* Modal */}
        {selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setSelectedBranch(null)}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
            className="relative w-full max-w-3xl mx-auto bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "85vh" }}
            >
            <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-200 rounded-t-3xl">
                <div>
                <h3 className="text-lg font-semibold">{selectedBranch.name}</h3>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                    <MapPin size={14} />
                    <span>{selectedBranch.address || "No address available"}</span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                    {branchEmployees.length} employee{branchEmployees.length !== 1 ? "s" : ""}
                </div>
                </div>

                <button onClick={() => setSelectedBranch(null)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                <X size={18} />
                </button>
            </div>

            <div className="p-4 overflow-auto" style={{ maxHeight: "64vh" }}>
                {filteredModalEmployees.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No employees assigned.</div>
                ) : (
                <ul className="space-y-3">
                    {filteredModalEmployees.map((emp) => (
                    <li
                        key={emp.employee_id}
                        className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:shadow-sm"
                    >
                        {emp.image ? (
                        <img
                            src={resolveImage(emp.image)}
                            alt={`${emp.first_name || ""} ${emp.last_name || ""}`}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-slate-200"
                            onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/dist/images/default-avatar.png";
                            }}
                        />
                        ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-semibold text-sm border border-slate-200">
                            {`${(emp.first_name?.[0] || "").toUpperCase()}${(emp.last_name?.[0] || "").toUpperCase()}`}
                        </div>
                        )}
                        <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                            {emp.first_name} {emp.middle_name || ""} {emp.last_name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                            {emp.employee_id} • {emp.position_name || "—"}
                        </div>
                        {emp.email && <div className="text-xs text-slate-400 mt-1 truncate">{emp.email}</div>}
                        </div>
                    </li>
                    ))}
                </ul>
                )}
            </div>

            <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-100 rounded-b-3xl">
                <button
                className="px-4 py-2 text-sm bg-slate-100 rounded-xl hover:bg-slate-200"
                onClick={() => setSelectedBranch(null)}
                >
                Close
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
    );
}
