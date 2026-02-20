import React, { useEffect, useMemo, useState } from "react";
import BASE_URL from "../../../backend/server/config";
import {
  X,
  MapPin,
  Users,
  Building2,
  Search,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CARDS_PER_PAGE = 4;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Returns true if the employee's status is "active" (case-insensitive). */
const isActive = (emp) =>
  (emp.status || "").toString().trim().toLowerCase() === "active";

// ─────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────���───────────
function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white border border-slate-100 p-3.5 shadow-sm animate-pulse overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
      <div className="flex justify-between items-start mb-2.5">
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-200 rounded-md" />
          <div className="h-2.5 w-16 bg-slate-100 rounded-md" />
        </div>
        <div className="h-4 w-10 bg-slate-100 rounded-full" />
      </div>
      <div className="h-2.5 w-3/4 bg-slate-100 rounded-md mb-1" />
      <div className="h-2.5 w-1/2 bg-slate-100 rounded-md mb-3.5" />
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="flex -space-x-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full bg-slate-200 border-2 border-white"
            />
          ))}
        </div>
        <div className="h-4 w-14 bg-slate-100 rounded-md" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AVATAR PILE
// ─────────────────────────────────────────────
function AvatarPile({ items = [], names = [], size = 6, max = 3 }) {
  const slice = items.slice(0, max);
  const displayNames = names.slice(0, max);

  return (
    <div className="flex -space-x-1.5 items-center">
      {slice.map((it, idx) =>
        it ? (
          <img
            key={idx}
            src={it}
            alt=""
            className={`w-${size} h-${size} rounded-full object-cover border-2 border-white shadow-sm bg-slate-100`}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/dist/images/default-avatar.png";
            }}
          />
        ) : (
          <div
            key={idx}
            className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[9px] font-bold text-white flex items-center justify-center border-2 border-white shadow-sm`}
          >
            {displayNames[idx]
              ? `${displayNames[idx][0]}${
                  displayNames[idx].split(" ").slice(-1)[0][0] || ""
                }`.toUpperCase()
              : "?"}
          </div>
        ),
      )}
      {items.length > max && (
        <div
          className={`w-${size} h-${size} rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 flex items-center justify-center border-2 border-white shadow-sm`}
        >
          +{items.length - max}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ACTIVE BADGE  ← NEW
// ─────────────────────────────────────────────
function ActiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold text-emerald-600 leading-none shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
      Active
    </span>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function BranchDirectory() {
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // ── Data Fetching ────────────────────────
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

  // ── ESC to close ─────────────────────────
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelectedBranch(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Helpers ───────────────────────────────
  const resolveImage = (img) => {
    if (!img) return null;
    const s = String(img).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("/")) return s;
    return `${BASE_URL}/images/${s}`;
  };

  // ── Active employees only  ← NEW ─────────
  // Filter the full employee list down to users whose status === "active".
  // Everything downstream (counts, avatars, modal list) uses this derived list.
  const activeEmployees = useMemo(
    () => employees.filter(isActive),
    [employees],
  );

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => (b.name || "").toLowerCase().includes(q));
  }, [branches, branchSearch]);

  // ── empMap now built from activeEmployees only  ← CHANGED ────────────────
  const empMap = useMemo(() => {
    const map = new Map();
    for (const e of activeEmployees) {
      const k = (e.branch_name || "").toLowerCase().trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(e);
    }
    return map;
  }, [activeEmployees]);

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

  // ── Visible cards ─────────────────────────
  const visibleBranches = useMemo(
    () =>
      showAll ? filteredBranches : filteredBranches.slice(0, CARDS_PER_PAGE),
    [filteredBranches, showAll],
  );
  const hiddenCount = filteredBranches.length - CARDS_PER_PAGE;

  // ─────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="relative px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-t-2xl" />
          <div className="flex items-center gap-3 mt-0.5">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow-sm shrink-0">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="h-3.5 w-28 bg-slate-200 rounded-md animate-pulse mb-1" />
              <div className="h-2.5 w-36 bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: CARDS_PER_PAGE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <div className="relative px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-white">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 rounded-t-2xl" />
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-100/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-0.5">
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow-md shadow-blue-200/50 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                Branch Directory
              </h3>
              {/*
                ← CHANGED: subtitle now shows total branches and ACTIVE staff count.
                activeEmployees.length replaces employees.length.
              */}
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                <span className="text-blue-600 font-semibold">
                  {branches.length}
                </span>{" "}
                locations ·{" "}
                <span className="text-emerald-600 font-semibold">
                  {activeEmployees.length}
                </span>{" "}
                active staff
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-48 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search branches..."
              value={branchSearch}
              onChange={(e) => {
                setBranchSearch(e.target.value);
                setShowAll(false);
              }}
              className="w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all duration-200"
            />
            {branchSearch && (
              <button
                onClick={() => {
                  setBranchSearch("");
                  setShowAll(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CARD GRID
      ══════════════════════════════════════ */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-b from-slate-50/60 to-white">
        {filteredBranches.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-2.5 shadow-inner">
              <Building2 className="w-4 h-4 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold text-xs">
              No branches found
            </p>
            <p className="text-slate-400 text-[11px] mt-1">
              Try a different search term.
            </p>
            {branchSearch && (
              <button
                onClick={() => setBranchSearch("")}
                className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {visibleBranches.map((branch) => {
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
                    className="group relative flex flex-col justify-between text-left w-full bg-white rounded-xl p-3 border border-slate-200/80 shadow-sm hover:shadow-md hover:shadow-blue-100/30 hover:border-blue-200 transition-all duration-300 overflow-hidden"
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-indigo-50/0 group-hover:from-blue-50/40 group-hover:to-indigo-50/15 transition-all duration-500 rounded-xl pointer-events-none" />
                    {/* Left accent bar */}
                    <div className="absolute top-2.5 bottom-2.5 left-0 w-0.5 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-300" />

                    {/* Card top */}
                    <div className="relative mb-2">
                      <div className="flex justify-between items-start gap-1.5 mb-1">
                        <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1 group-hover:text-blue-700 transition-colors duration-200 leading-tight">
                          {branch.name}
                        </h4>
                        <span className="shrink-0 px-1 py-0.5 rounded bg-slate-100 text-slate-400 text-[8px] font-bold border border-slate-200 uppercase tracking-wide group-hover:bg-blue-50 group-hover:text-blue-400 group-hover:border-blue-100 transition-colors">
                          #{branch.branch_id}
                        </span>
                      </div>
                      <div className="flex items-start gap-1 text-[10px] text-slate-400 min-h-[1.5rem]">
                        <MapPin
                          size={9}
                          className="mt-0.5 shrink-0 text-slate-300 group-hover:text-blue-400 transition-colors"
                        />
                        <span className="line-clamp-2 leading-relaxed">
                          {branch.address || "No address on record"}
                        </span>
                      </div>
                    </div>

                    {/* Card footer — shows active member count  ← CHANGED */}
                    <div className="pt-2 border-t border-slate-100 group-hover:border-blue-100 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AvatarPile
                          items={avatars}
                          names={names}
                          size={5}
                          max={3}
                        />
                        <span className="text-[9px] text-slate-400 font-medium">
                          {count > 0 ? (
                            <span className="text-emerald-600 font-semibold">
                              {count}{" "}
                              <span className="text-slate-400 font-medium">
                                active {count === 1 ? "member" : "members"}
                              </span>
                            </span>
                          ) : (
                            <span className="italic text-slate-300">
                              No active staff
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-4 h-4 rounded bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors duration-200">
                        <ArrowRight
                          size={9}
                          className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-px transition-all duration-200"
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── See More / See Less ── */}
            {filteredBranches.length > CARDS_PER_PAGE && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {showAll
                      ? `All ${filteredBranches.length} branches`
                      : `${hiddenCount} more`}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200" />
                </div>

                <button
                  onClick={() => setShowAll((p) => !p)}
                  className="group w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-[11px] font-semibold text-slate-500 hover:text-blue-700 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all duration-200 shadow-sm"
                >
                  {showAll ? (
                    <>
                      <ChevronUp
                        size={12}
                        className="group-hover:-translate-y-0.5 transition-transform duration-200"
                      />
                      See Less
                    </>
                  ) : (
                    <>
                      <ChevronDown
                        size={12}
                        className="group-hover:translate-y-0.5 transition-transform duration-200"
                      />
                      See {hiddenCount} More{" "}
                      {hiddenCount === 1 ? "Branch" : "Branches"}
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════
          MODAL
      ══════════════════════════════════════ */}
      {selectedBranch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedBranch(null)}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]" />

          <div
            className="relative w-full max-w-lg sm:max-w-xl bg-white rounded-2xl shadow-2xl shadow-slate-900/20 flex flex-col max-h-[88vh] overflow-hidden"
            style={{
              animation: "modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />

            {/* Modal Header */}
            <div className="px-5 sm:px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md shadow-blue-200/60 shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {selectedBranch.name}
                    </h2>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                      <MapPin size={11} className="text-slate-300 shrink-0" />
                      <span className="line-clamp-1">
                        {selectedBranch.address || "Address not set"}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBranch(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all duration-200 shrink-0 ml-2"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Stat pills  ← CHANGED: uses UserCheck icon + "active employees" label */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <UserCheck size={11} />
                  {branchEmployees.length} active{" "}
                  {branchEmployees.length === 1 ? "employee" : "employees"}
                </div>
                {selectedBranch.branch_id && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <Building2 size={11} />
                    Branch #{selectedBranch.branch_id}
                  </div>
                )}
              </div>

              {/* Modal search */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or position..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all duration-200"
                />
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Sticky count bar  ← CHANGED: prefixed with "active" */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-5 sm:px-6 py-2 border-b border-slate-50 z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {filteredModalEmployees.length} active{" "}
                  {filteredModalEmployees.length === 1
                    ? "employee"
                    : "employees"}
                  {modalSearch && (
                    <span className="ml-1.5 text-blue-500 normal-case font-semibold tracking-normal">
                      for "{modalSearch}"
                    </span>
                  )}
                </p>
              </div>

              <div className="px-3 sm:px-4 py-2 pb-3">
                {filteredModalEmployees.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-2 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shadow-inner">
                      <Users className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 mt-1">
                      No active employees found
                    </p>
                    <p className="text-xs text-slate-400">
                      {modalSearch
                        ? "Try a different search term."
                        : "This branch has no active staff assigned."}
                    </p>
                    {modalSearch && (
                      <button
                        onClick={() => setModalSearch("")}
                        className="mt-1 text-xs text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5 mt-1">
                    {filteredModalEmployees.map((emp, idx) => (
                      <div
                        key={emp.employee_id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors duration-150 group cursor-default"
                      >
                        {/* Avatar with active status dot */}
                        <div className="relative shrink-0">
                          {emp.image ? (
                            <img
                              src={resolveImage(emp.image)}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "/dist/images/default-avatar.png";
                              }}
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm"
                              style={{
                                background: `hsl(${(idx * 47 + 210) % 360}, 60%, 55%)`,
                              }}
                            >
                              {`${(emp.first_name?.[0] || "").toUpperCase()}${(emp.last_name?.[0] || "").toUpperCase()}`}
                            </div>
                          )}
                          {/*
                            ← The green dot is now semantically correct:
                            only active employees are in this list, so the
                            dot truthfully means "active / online".
                          */}
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full shadow-sm" />
                        </div>

                        {/* Employee info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-800 truncate">
                              {emp.first_name}{" "}
                              {emp.middle_name ? `${emp.middle_name[0]}.` : ""}{" "}
                              {emp.last_name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              {emp.employee_id}
                            </span>
                          </div>

                          {/* Position + Active badge  ← CHANGED */}
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <p className="text-xs text-blue-600 font-medium truncate">
                              {emp.position_name || "No Position"}
                            </p>
                            <ActiveBadge />
                          </div>

                          {emp.email && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
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
            <div className="px-5 sm:px-6 py-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Press{" "}
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded-md text-slate-500 shadow-sm">
                  ESC
                </kbd>{" "}
                to close
              </p>
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}
