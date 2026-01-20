// LayoutSMDashboard_AllRows.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { saveAs } from "file-saver";
import ExcelJS from "exceljs";
import BASE_URL from "../../../../backend/server/config";
import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI";
import ConflictResolverModal from "./ConflicResolveModal";
import { useSession } from "../../../context/SessionContext";
import { notifyAllEmployees } from "./utils/notifyAllEmployees";

import ScheduleGrid from "./components/ScheduleGrid";
import PendingPanel from "./components/PendingPanel";
import PopoverEditor from "./components/PopoverEditor";

import { fmtDisplayDate } from "./utils/scheduleUtils";

/*
  Screenshot path (local) you provided (use your tool to convert this to a URL):
  /mnt/data/24e53ca1-03c0-4821-83d4-184c7bcb8a50.png
*/

export default function LayoutSMDashboard_AllRows() {
  const { user } = useSession();

  // core state (unchanged)
  const [groups, setGroups] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState("");

  // date range
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => { const t = new Date(); t.setDate(t.getDate() + 13); return t.toISOString().slice(0, 10); });

  // UI filters
  const [branchesList, setBranchesList] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [search, setSearch] = useState("");

  // shifts & submissions
  const [workTimes, setWorkTimes] = useState([]);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState(() => new Map());

  // leave types & map
  const [leaveTypesMap, setLeaveTypesMap] = useState(() => new Map());
  const [leaveMap, setLeaveMap] = useState(() => new Map());

  // approver roles
  const [currentUserApproverLevel, setCurrentUserApproverLevel] = useState(null);
  const [approverLevel, setApproverLevel] = useState(2);

  // bulk / selection
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(() => new Set());
  const [bulkComment, setBulkComment] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // editor popover
  const [editingCell, setEditingCell] = useState(null);
  const [saving, setSaving] = useState(false);

  // container ref
  const containerRef = useRef(null);

  // backend employees cache
  const [backendEmployeesCache, setBackendEmployeesCache] = useState({});

  // deterministic color for shift id (returns HSL string if you used it elsewhere)
  const colorForId = (id) => {
    if (id == null) return "#f1f5f9";
    const n = parseInt(String(id).replace(/\D/g, "") || "0", 10);
    const hue = (n * 137) % 360;
    return `hsl(${hue}deg 75% 48%)`;
  };

  // new deterministic color => ARGB hex for ExcelJS (FFRRGGBB)
  const colorForIdHex = (id) => {
    // produce same hue as colorForId and convert to hex
    if (id == null) return "FFFFFFFF";
    const n = parseInt(String(id).replace(/\D/g, "") || "0", 10);
    const hue = (n * 137) % 360;
    const s = 0.75;
    const l = 0.48;
    const h = hue;

    // HSL to RGB
    const hToRgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const hh = h / 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : (l + s - l * s);
      const p = 2 * l - q;
      r = hToRgb(p, q, hh + 1/3);
      g = hToRgb(p, q, hh);
      b = hToRgb(p, q, hh - 1/3);
    }
    const toHex = (x) => {
      const v = Math.round(x * 255);
      const sHex = v.toString(16).padStart(2, "0");
      return sHex.toUpperCase();
    };
    const hex = `${toHex(r)}${toHex(g)}${toHex(b)}`;
    return `FF${hex}`; // ARGB for Excel
  };

  // ---------- Load static lists ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${BASE_URL}/branches/get_branch.php`);
        const raw = res.data?.data || [];
        const normalized = (Array.isArray(raw) ? raw : []).map((b) => ({
          ...b,
          branch_id: b.branch_id ?? b.id ?? b.branchId ?? null,
          branch_name: b.name ?? b.branch_name ?? b.branchName ?? `Branch ${b.branch_id ?? b.id ?? ""}`,
        }));
        setBranchesList(res.data?.success ? normalized : []);
      } catch (err) {
        console.error("Failed to fetch branches", err);
        setBranchesList([]);
      }
    })();
  }, []);

  // ---------- Load leave types ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await ScheduleManagerAPI.readLeaveTypes?.();
        const arr = res?.data ?? [];
        const m = new Map();
        (arr || []).forEach((lt) => m.set(String(lt.leave_type_id), lt.leave_name || lt.leave_name || `Type ${lt.leave_type_id}`));
        setLeaveTypesMap(m);
      } catch (err) {
        console.warn("Failed to fetch leave types", err);
        setLeaveTypesMap(new Map());
      }
    })();
  }, []);

  const handleNotifyAll = async () => {
    if (!startDate || !endDate) {
      Swal.fire("Invalid Range", "Please select a valid start and end date.", "warning");
      return;
    }

    const readableStart = fmtDisplayDate(startDate);
    const readableEnd = fmtDisplayDate(endDate);

    setLoading(true);
    setNotifyStatus("Sending notifications...");

    Swal.fire({
      title: "Sending Shift Schedule to All Employees",
      html: `Emails are being sent for range <b>${readableStart}</b> → <b>${readableEnd}</b>.<br>Please wait...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await axios.get(`${BASE_URL}/schedule-manager/approvals/list_submissions.php`, {
        params: { start_date: startDate, end_date: endDate },
      });

      const submissions = (res.data?.success && Array.isArray(res.data.data)) ? res.data.data : [];

      const workTimesMap = new Map(workTimes.map((wt) => [String(wt.id ?? wt.work_time_id), wt]));

      const enrichedSubs = submissions.map((s) => {
        const wt = workTimesMap.get(String(s.work_time_id));
        return {
          ...s,
          shift_name: wt?.shift_name || s.shift_name || "No Shift Assigned",
          start_time: wt?.start_time || s.start_time || "",
          end_time: wt?.end_time || s.end_time || "",
        };
      });

      const sent = await notifyAllEmployees({
        startDate: readableStart,
        endDate: readableEnd,
        submissions: enrichedSubs,
        onProgress: (msg) => setNotifyStatus(msg),
        onDone: () => setNotifyStatus("All notifications sent."),
      });

      if (sent) {
        Swal.fire("✅ Success", `Emails successfully sent for range ${readableStart} → ${readableEnd}`, "success");
      }
    } catch (err) {
      console.error("Notify all failed", err);
      Swal.fire("❌ Error", err.message || "Failed to send notifications.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Load work times ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await ScheduleManagerAPI.readWorkTimes();
        const arr = Array.isArray(res) ? res : res?.data || res?.data?.data || [];
        const normalized = (Array.isArray(arr) ? arr : []).map((s, idx) => ({
          id: s?.id ?? s?.work_time_id ?? idx,
          work_time_id: s?.work_time_id ?? s?.id ?? idx,
          shift_name: s?.shift_name ?? s?.name ?? `Shift ${idx + 1}`,
          start_time: s?.start_time ?? s?.start ?? null,
          end_time: s?.end_time ?? s?.end ?? null,
          ...s,
        }));
        setWorkTimes(normalized);
      } catch (err) {
        console.error("Error loading workTimes", err);
        setWorkTimes([]);
      }
    })();
  }, []);

  // ---------- Role approver levels ----------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${BASE_URL}/user_role_lists/get_role_approver_levels.php`);
        if (!mounted) return;
        if (res.data?.success && Array.isArray(res.data.data)) {
          const list = res.data.data;
          const map = {};
          list.forEach((r) => { map[String(r.role_id || "")] = r.approver_level === null || r.approver_level === undefined ? null : Number(r.approver_level); });
          let userLevel = null;
          if (user) {
            const userRoleId = user?.role_id ?? user?.roleId ?? null;
            if (userRoleId) {
              const key = String(userRoleId);
              if (map[key] !== undefined) userLevel = map[key];
            }
            if (userLevel === null || userLevel === undefined) {
              const uname = (user?.role_name || user?.role || "").toString().trim().toLowerCase();
              if (uname) {
                for (const r of list) {
                  if ((r.role_name || "").toString().trim().toLowerCase() === uname) {
                    userLevel = r.approver_level === null || r.approver_level === undefined ? null : Number(r.approver_level);
                    break;
                  }
                }
              }
            }
          }
          if (userLevel === undefined) userLevel = null;
          setCurrentUserApproverLevel(userLevel === null ? null : userLevel);
        } else {
          setCurrentUserApproverLevel(null);
        }
      } catch (err) {
        console.error("Error loading role approver levels", err);
        setCurrentUserApproverLevel(null);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (currentUserApproverLevel !== null && currentUserApproverLevel !== undefined) {
      setApproverLevel(Number(currentUserApproverLevel));
    }
  }, [currentUserApproverLevel]);

  // ---------- Helpers ----------
  const findWorkTimeById = (id) => {
    if (id === null || id === undefined || id === "") return null;
    return workTimes.find((w) => String(w.id ?? w.work_time_id) === String(id)) || null;
  };

  const findEmployeeNameById = (id) => {
    if (!id) return "Unknown";
    const sid = String(id);
    for (const g of (groups || [])) {
      for (const emp of (g.employees || [])) {
        if (String(emp.employee_id) === sid) {
          const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
          if (name) return name;
        }
      }
    }
    const sub = (submissionsList || []).find((s) => String(s.employee_id) === sid);
    if (sub) return sub.employee_name || sub.full_name || `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || `Emp ${sid}`;
    return `Emp ${sid}`;
  };

  const fetchBackendEmployees = async (branchId = "") => {
    const key = branchId ? String(branchId) : "all";
    if (backendEmployeesCache[key]) return backendEmployeesCache[key];
    try {
      const res = await axios.get(`${BASE_URL}/branches/get_all.php`);
      let arr = res.data?.success ? (res.data.data || []) : [];
      arr = arr
        .filter((e) => String(e.status || "").toLowerCase() !== "inactive")
        .map((e) => ({ ...e, full_name: e.full_name || `${e.first_name || ""} ${e.last_name || ""}`.trim(), branch_id: e.branch_id === undefined ? null : e.branch_id, branch_name: e.branch_name ?? "" }));
      let filtered = arr;
      if (key === "unassigned") {
        const validBranchIds = new Set((branchesList || []).map((b) => String(b.branch_id)));
        filtered = arr.filter((x) => {
          const bid = x.branch_id;
          if (bid === null || bid === undefined) return true;
          const s = String(bid).trim();
          if (s === "" || Number(bid) === 0) return true;
          if (!validBranchIds.has(String(bid))) return true;
          return false;
        });
      } else if (key !== "all") {
        filtered = arr.filter((x) => String(x.branch_id) === String(key));
      }
      setBackendEmployeesCache((p) => ({ ...(p || {}), [key]: filtered }));
      return filtered;
    } catch (err) {
      console.error("fetchBackendEmployees error", err);
      setBackendEmployeesCache((p) => ({ ...(p || {}), [key]: [] }));
      return [];
    }
  };

  const fetchSubmissions = async (s = startDate, e = endDate, branchId = selectedBranchId) => {
    try {
      const res = await axios.get(`${BASE_URL}/schedule-manager/approvals/list_submissions.php`, {
        params: { start_date: s, end_date: e, branch_id: branchId || undefined },
      });
      const subs = (res.data?.success && Array.isArray(res.data.data)) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setSubmissionsList(subs || []);
      const map = new Map();
      (subs || []).forEach((sub) => {
        const emp = String(sub.employee_id || "");
        const dateKey = String(sub.effective_date || "");
        if (!emp || !dateKey) return;
        const k = `${emp}|${dateKey}`;
        const existing = map.get(k);
        if (!existing || (sub.submission_id && existing.submission_id < sub.submission_id)) {
          map.set(k, sub);
        }
      });
      setSubmissionsMap(map);
      return map;
    } catch (err) {
      console.error("Failed to fetch submissions", err);
      setSubmissionsList([]);
      setSubmissionsMap(new Map());
      return new Map();
    }
  };

  const datesBetween = (from, to) => {
    const out = [];
    const s = new Date(from);
    const e = new Date(to);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      out.push(`${year}-${month}-${day}`);
    }
    return out;
  };

  const fetchLeaves = async (s = startDate, e = endDate, branchId = selectedBranchId) => {
    try {
      if (!ScheduleManagerAPI.fetchLeavesRange) return new Map();
      const res = await ScheduleManagerAPI.fetchLeavesRange(s, e, branchId || null);
      const rows = res?.data ?? [];
      const map = new Map();
      (rows || []).forEach((lv) => {
        if (!lv || String(lv.status).toLowerCase() !== "approved") return;
        const from = lv.date_from;
        const until = lv.date_until;
        if (!from || !until) return;
        const list = datesBetween(from, until);
        list.forEach((d) => {
          const key = `${String(lv.employee_id)}|${d}`;
          const enriched = { ...lv, leave_type_name: leaveTypesMap.get(String(lv.leave_type_id)) || lv.leave_type_name || null };
          const existing = map.get(key);
          if (!existing || (lv.leave_id && existing.leave_id < lv.leave_id)) map.set(key, enriched);
        });
      });
      setLeaveMap(map);
      return map;
    } catch (err) {
      console.error("Failed to fetch leaves", err);
      setLeaveMap(new Map());
      return new Map();
    }
  };

  // ---------- Load schedules range & enrich ----------
  const loadRange = async (s = startDate, e = endDate, branchId = selectedBranchId) => {
    setLoading(true);
    try {
      const res = await ScheduleManagerAPI.readSchedulesRange(s, e);
      if (!res?.success || !res.data) {
        console.error("readSchedulesRange returned unexpected:", res);
        setGroups([]);
        setDates([]);
        setLoading(false);
        return;
      }

      let cleaned = (res.data.groups || []).map((g) => ({ ...g, employees: (g.employees || []).filter((emp) => !emp.status || emp.status === "active") })).filter((g) => (g.employees || []).length > 0);

      const backendList = await fetchBackendEmployees(branchId || "");
      const backendMap = new Map();
      (backendList || []).forEach((b) => { if (b && b.employee_id) backendMap.set(String(b.employee_id), b); });

      cleaned = cleaned.map((g) => ({
        ...g,
        employees: (g.employees || []).map((emp) => {
          const id = String(emp.employee_id || "");
          const be = backendMap.get(id);
          const base = { ...emp, full_name: emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() };
          if (be) {
            return { ...base, branch_id: be.branch_id ?? base.branch_id ?? null, branch_name: be.branch_name ?? base.branch_name ?? "" };
          }
          return base;
        })
      }));

      if (branchId) {
        cleaned = cleaned
          .map((g) => ({ ...g, employees: (g.employees || []).filter((emp) => backendMap.has(String(emp.employee_id || ""))) }))
          .filter((g) => (g.employees || []).length > 0);

        const foundIds = new Set();
        cleaned.forEach((g) => g.employees.forEach((emp) => foundIds.add(String(emp.employee_id))));
        const missing = (backendList || []).filter((beEmp) => !foundIds.has(String(beEmp.employee_id)));

        if (missing.length) {
          const unscheduledGroup = {
            position_id: "unscheduled_backend",
            position_name: "Unscheduled",
            department_name: missing[0]?.department_name || "",
            employees: missing.map((m) => ({ ...m, full_name: m.full_name || `${m.first_name || ""} ${m.last_name || ""}`.trim(), schedules: {} })),
          };
          cleaned = [unscheduledGroup, ...cleaned];
        }
      } else {
        cleaned = cleaned.map((g) => ({ ...g, employees: (g.employees || []).map((emp) => { const be = backendMap.get(String(emp.employee_id || "")); return { ...emp, branch_name: emp.branch_name || be?.branch_name || "", branch_id: emp.branch_id ?? be?.branch_id ?? null }; }) }));
      }

      setGroups(cleaned);
      setDates(res.data.dates || []);

      const subsMap = await fetchSubmissions(s, e, branchId);
      const leavesMapBuilt = await fetchLeaves(s, e, branchId);

      const perEmpLeaves = new Map();
      leavesMapBuilt.forEach((lv, k) => {
        const [eid, dateKey] = String(k).split("|");
        if (!perEmpLeaves.has(String(eid))) perEmpLeaves.set(String(eid), {});
        perEmpLeaves.get(String(eid))[dateKey] = lv;
      });

      setGroups((prevGroups) => (prevGroups || []).map((g) => ({ ...g, employees: (g.employees || []).map((emp) => {
        const pending = {};
        subsMap.forEach((sub, key) => {
          const [eid, dateKey] = key.split("|");
          if (String(eid) === String(emp.employee_id)) pending[dateKey] = sub;
        });

        const empLeaves = perEmpLeaves.get(String(emp.employee_id)) || {};
        return { ...emp, pending_submissions: pending, approved_leaves: empLeaves };
      }) })));
    } catch (err) {
      console.error("Error loading schedules:", err);
      setGroups([]);
      setDates([]);
    } finally {
      setLoading(false);
    }
  };

  // auto-load
  useEffect(() => { loadRange(); }, []);
  useEffect(() => { loadRange(startDate, endDate, selectedBranchId); }, [startDate, endDate, selectedBranchId, branchesList]);

  // ---------- Derived data ----------
  const positionOptions = useMemo(() => {
    const setPos = new Set();
    (groups || []).forEach((g) => {
      if (selectedBranchId) {
        const hasEmpInBranch = (g.employees || []).some((emp) => String(emp.branch_id ?? "") === String(selectedBranchId));
        if (!hasEmpInBranch) return;
      }
      const gp = (g.position_name || g.position || "").toString().trim();
      if (gp) setPos.add(gp);
      (g.employees || []).forEach((emp) => {
        const ep = (emp.position_name || emp.position || "").toString().trim();
        if (ep) setPos.add(ep);
      });
    });
    return Array.from(setPos).sort((a, b) => a.localeCompare(b));
  }, [groups, selectedBranchId]);

  // ---------- Filtered groups ----------
  const filteredGroups = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return (groups || []).map((g) => ({
      ...g,
      employees: (g.employees || []).filter((emp) => {
        if (selectedBranchId) {
          if (String(selectedBranchId) === "unassigned") {
            const bid = emp.branch_id;
            const validBranchIds = new Set((branchesList || []).map((b) => String(b.branch_id)));
            const isUnassigned = (bid === null || bid === undefined) || String(bid).trim() === "" || Number(bid) === 0 || !validBranchIds.has(String(bid));
            if (!isUnassigned) return false;
          } else {
            if (String(emp.branch_id ?? "") !== String(selectedBranchId)) return false;
          }
        }
        if (selectedPosition) {
          const empPosition = (emp.position_name || emp.position || g.position_name || "").toString().trim().toLowerCase();
          if (!empPosition || empPosition !== String(selectedPosition).toLowerCase()) return false;
        }
        if (q) {
          const full = `${emp.first_name || ""} ${emp.last_name || ""} ${emp.middle_name || ""}`.toLowerCase();
          if (!full.includes(q)) return false;
        }
        return true;
      })
    })).filter((g) => (g.employees || []).length > 0);
  }, [groups, selectedBranchId, selectedPosition, search, branchesList]);

  // pending submissions (client-side)
  const pendingSubmissions = useMemo(() => {
    return (submissionsList || []).filter((s) => {
      const st = (s.status || "").toLowerCase();
      return st !== "applied" && st !== "rejected";
    });
  }, [submissionsList]);

  // ---------- NEW: ExcelJS export with styling ----------
  const exportVisibleXLSX = async () => {
    const visibleGroups = filteredGroups;

    // build date headers
    const dateHeaders = (dates && dates.length) ? dates : (() => {
      const s = new Date(`${startDate}T00:00:00`);
      const e = new Date(`${endDate}T00:00:00`);
      const arr = [];
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) arr.push(d.toISOString().slice(0, 10));
      return arr;
    })();

    const subsMap = submissionsMap || new Map();
    const totalCols = 2 + dateHeaders.length;

    const dateLabelShort = (dStr) => {
      try {
        const d = new Date(dStr);
        const m = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
        const day = String(d.getDate()).padStart(2, "0");
        return `${m}${day}`;
      } catch (e) {
        return dStr;
      }
    };
    const weekdayLabel = (dStr) => {
      try { return new Date(dStr).toLocaleString("en-US", { weekday: "long" }).toUpperCase(); } catch (e) { return ""; }
    };

    // build rows
    const rows = [];
    const formattedRange = `${fmtDisplayDate(startDate)} - ${fmtDisplayDate(endDate)}`;
    // row 1 (title + date range)
    const row0 = new Array(totalCols).fill("");
    row0[0] = "PROPOSED SCHEDULE";
    row0[2] = formattedRange;
    rows.push(row0);

    // metadata rows
    const row1 = new Array(totalCols).fill(""); row1[0] = "NOTED BY:"; row1[1] = (user?.full_name || user?.name || "");
    const row2 = new Array(totalCols).fill(""); row2[0] = "CHECKED BY:"; row2[1] = "";
    const row3 = new Array(totalCols).fill(""); row3[0] = "PREPARED BY:"; row3[1] = (user?.full_name || user?.name || "");
    rows.push(row1, row2, row3);
    rows.push(new Array(totalCols).fill("")); // spacer

    // header row (names) -> Excel row 6
    const headerRow = ["NAME OF EMPLOYEES", "POSITION", ...dateHeaders.map(d => dateLabelShort(d))];
    rows.push(headerRow);

    // weekday row -> Excel row 7
    const weekdayRow = ["", "", ...dateHeaders.map(d => weekdayLabel(d))];
    rows.push(weekdayRow);

    // employee rows start at Excel row 8
    for (const g of visibleGroups) {
      const posName = g.position_name || "";
      for (const emp of (g.employees || [])) {
        const empName = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || `Emp ${emp.employee_id}`;
        const baseRow = [empName, posName];
        const empId = emp.employee_id ?? "";
        for (const d of dateHeaders) {
          const k = `${String(empId)}|${String(d)}`;
          const sub = subsMap.get(k);
          const leave = (emp.approved_leaves && emp.approved_leaves[d]) ? emp.approved_leaves[d] : leaveMap.get(k);
          let cell = "-";
          if (sub) {
            const status = sub.status || "";
            if (sub.work_time_id === null || sub.work_time_id === "" || sub.work_time_id === undefined) {
              cell = `— Clear — [${status}]`;
            } else {
              const wt = findWorkTimeById(sub.work_time_id);
              const shiftName = wt?.shift_name || sub.shift_name || `Shift ${sub.work_time_id}`;
              const times = wt ? ` (${wt.start_time ?? ""}${wt.start_time && wt.end_time ? " - " : ""}${wt.end_time ?? ""})` : "";
              cell = `${shiftName}${times} [${status}]`;
            }
          } else if (leave) {
            const typeName = leave.leave_type_name || leave.leave_type_id || "Leave";
            cell = `On Leave: ${typeName}`;
          } else {
            const sched = (emp.schedules && emp.schedules[d]) ? emp.schedules[d] : null;
            if (sched) {
              const name = sched.shift_name || "";
              const times = sched.start_time || sched.end_time ? ` (${sched.start_time ?? ""}${sched.start_time && sched.end_time ? " - " : ""}${sched.end_time ?? ""})` : "";
              cell = `${name}${times}`;
            } else {
              cell = "-";
            }
          }
          baseRow.push(cell);
        }
        rows.push(baseRow);
      }
    }

    // validate data exist
    if (rows.length <= 7) {
      Swal.fire("No data", "There is no visible data to export using current filters.", "info");
      return;
    }

    // create workbook and worksheet
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Proposed Schedule", { properties: { defaultRowHeight: 20 } });

      // set column widths
      ws.columns = [{ width: 30 }, { width: 20 }, ...dateHeaders.map(() => ({ width: 16 }))];

      // add rows
      rows.forEach((r) => ws.addRow(r));

      // merges: A1:B1, C1: last, A2:B2, A3:B3, A4:B4
      const lastCol = totalCols;
      ws.mergeCells(1, 1, 1, 2); // A1:B1
      ws.mergeCells(1, 3, 1, lastCol); // C1: last col in row 1
      ws.mergeCells(2, 1, 2, 2);
      ws.mergeCells(3, 1, 3, 2);
      ws.mergeCells(4, 1, 4, 2);

      // Title cell A1 style
      const A1 = ws.getCell("A1");
      A1.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF0B3954" } };
      A1.alignment = { vertical: "middle", horizontal: "left" };
      A1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDEBD0" } };

      // Date range cell C1 style
      const c1Cell = ws.getCell(1, 3);
      c1Cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FF073B4C" } };
      c1Cell.alignment = { vertical: "middle", horizontal: "right" };
      c1Cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBF0FF" } };

      // Header row (Excel row 6)
      const headerRowNumber = 6;
      const headerRowObj = ws.getRow(headerRowNumber);
      headerRowObj.height = 26;
      headerRowObj.eachCell((cell) => {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2B6CB0" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      });

      // Weekday row (Excel row 7)
      const weekdayRowNumber = 7;
      const weekdayRowObj = ws.getRow(weekdayRowNumber);
      weekdayRowObj.eachCell((cell, colNumber) => {
        if (colNumber >= 3) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB91C1C" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF0E0" } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7FAFC" } };
        }
      });

      // Style metadata labels A2..A4 and their values
      for (let r = 2; r <= 4; r++) {
        const labelCell = ws.getRow(r).getCell(1);
        labelCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF1F2937" } };
        labelCell.alignment = { vertical: "middle", horizontal: "left" };
        const valueCell = ws.getRow(r).getCell(2);
        valueCell.font = { name: "Calibri", size: 10, color: { argb: "FF1F2937" } };
        valueCell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // Employee rows styling: zebra, center date columns, color shift cells
      const firstDataRowExcel = 8;
      let counter = 0;
      for (let r = firstDataRowExcel; r <= ws.rowCount; r++) {
        const rowObj = ws.getRow(r);
        const isOdd = (counter % 2) === 1;
        const fillColor = isOdd ? "FFF8FAFB" : "FFFFFFFF";

        // name & position
        ["A", "B"].forEach((colLetter, idx) => {
          const cell = rowObj.getCell(idx + 1);
          cell.font = { name: "Calibri", size: 11, color: { argb: "FF0F172A" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
          cell.alignment = { horizontal: "left", vertical: "middle" };
        });

        // date cells
        for (let c = 3; c <= totalCols; c++) {
          const cell = rowObj.getCell(c);
          // apply base style
          cell.font = { name: "Calibri", size: 11, color: { argb: "FF0F172A" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

          // color cell background if it looks like a shift name (heuristic: not "-" and not "On Leave")
          const text = typeof cell.value === "string" ? cell.value : (cell.value ? String(cell.value) : "");
          if (text && text !== "-" && !text.toLowerCase().includes("on leave")) {
            // attempt to find shift id by looking up in submissionsMap or schedules is not trivial here,
            // so we will color by hashing the text (fallback). If you prefer color by work_time_id,
            // we could store a parallel matrix, but keeping simple — deterministic color by text.
            // Convert a stable hash from the text and create hue.
            let hash = 0;
            for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
            const hue = (Math.abs(hash) * 37) % 360;
            const rgbHex = (() => {
              // convert hsl(hue, 0.6, 0.6) approx to hex quickly
              const h = hue / 360;
              const s = 0.6;
              const l = 0.82; // lighter so text remains readable
              const hToRgbLocal = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
              };
              let r, g, b;
              if (s === 0) r = g = b = l;
              else {
                const q = l < 0.5 ? l * (1 + s) : (l + s - l * s);
                const p = 2 * l - q;
                r = hToRgbLocal(p, q, h + 1/3);
                g = hToRgbLocal(p, q, h);
                b = hToRgbLocal(p, q, h - 1/3);
              }
              const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0").toUpperCase();
              return `FF${toHex(r)}${toHex(g)}${toHex(b)}`;
            })();
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rgbHex } };
            // ensure text contrast: set font to white if background is dark-ish
            cell.font = { ...cell.font, color: { argb: "FFFFFFFF" } };
          }

          // if the cell contains "On Leave" explicitly, make the font red and bold
          if (typeof cell.value === "string" && cell.value.toLowerCase().includes("on leave")) {
            cell.font = { ...cell.font, color: { argb: "FFB91C1C" }, bold: true };
          }
        }

        // add border to row
        rowObj.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFEEEEEE" } },
            left: { style: "thin", color: { argb: "FFEEEEEE" } },
            bottom: { style: "thin", color: { argb: "FFEEEEEE" } },
            right: { style: "thin", color: { argb: "FFEEEEEE" } },
          };
        });

        counter++;
      }

      // finalize workbook and save
      const buf = await wb.xlsx.writeBuffer();
      const branchLabel = selectedBranchId ? (branchesList.find(b => String(b.branch_id) === String(selectedBranchId))?.branch_name || selectedBranchId) : "AllBranches";
      const posLabel = selectedPosition || "AllPositions";
      const filename = `proposed_schedule_${String(branchLabel).replace(/\s+/g, "_")}_${String(posLabel).replace(/\s+/g, "_")}_${startDate}_to_${endDate}.xlsx`;
      const blob = new Blob([buf], { type: "application/octet-stream" });
      saveAs(blob, filename);
    } catch (err) {
      console.error("ExcelJS export failed", err);
      Swal.fire("Error", "Failed to generate styled XLSX file.", "error");
    }
  };

  // ---------- Selection helpers / bulk actions / cell clicks (unchanged) ----------
  const toggleSelectSubmission = (submission_id) => {
    const sub = (pendingSubmissions || []).find((p) => Number(p.submission_id) === Number(submission_id));
    if (!sub) return;
    const status = (sub.status || "").toLowerCase();
    const canApprove = (currentUserApproverLevel === 1 && status === "pending") || (currentUserApproverLevel === 2 && (status === "pending" || status === "lvl1_approved"));
    const canReject = true;
    if (!canApprove && !canReject) {
      Swal.fire("Not allowed", "You cannot act on this submission (insufficient level or wrong status).", "info");
      return;
    }
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(Number(submission_id))) next.delete(Number(submission_id));
      else next.add(Number(submission_id));
      return next;
    });
  };

  const onSelectAllPending = (checked, visibleIds = []) => {
    if (checked) {
      const allowed = (pendingSubmissions || []).filter((p) => visibleIds.includes(Number(p.submission_id)) && ((currentUserApproverLevel === 1 && (p.status || "").toLowerCase() === "pending") || (currentUserApproverLevel === 2 && (["pending", "lvl1_approved"].includes((p.status || "").toLowerCase())))));
      const allIds = new Set(allowed.map((p) => Number(p.submission_id)));
      setSelectedSubmissionIds(allIds);
    } else {
      setSelectedSubmissionIds(new Set());
    }
  };

  const bulkApproveReject = async (action) => {
    if (!(currentUserApproverLevel === 1 || currentUserApproverLevel === 2) && action === "approve") {
      Swal.fire("Forbidden", "You are not an approver.", "error");
      return;
    }

    const selectedArr = Array.from(selectedSubmissionIds).filter(Boolean).map((v) => Number(v));
    if (!selectedArr.length) {
      Swal.fire("No selection", "Select submissions to process.", "info");
      return;
    }

    const allowedForAction = (pendingSubmissions || []).filter((p) => selectedArr.includes(Number(p.submission_id)));
    const rowsHtml = allowedForAction.map((p) => {
      const name = findEmployeeNameById(p.employee_id);
      const shift = (p.work_time_id === null || p.work_time_id === "") ? "— Clear —" : (findWorkTimeById(p.work_time_id)?.shift_name || p.shift_name || `Shift ${p.work_time_id}`);
      const date = fmtDisplayDate(p.effective_date);
      return `<div style="padding:6px 4px;border-bottom:1px solid #f3f4f6;"><strong>${name}</strong><div style="font-size:12px;color:#6b7280">${date} — ${shift}</div></div>`;
    }).join("");

    const confirm = await Swal.fire({
      title: `${action === "approve" ? "Approve" : "Reject"} ${selectedArr.length} submission(s)?`,
      html: `<div style="max-height:300px;overflow:auto;text-align:left;margin-bottom:8px">${rowsHtml}</div><div style="font-size:13px"><b>Comment:</b><br/><i>${bulkComment || "(none)"}</i></div>`,
      showCancelButton: true,
      confirmButtonText: action === "approve" ? "Approve" : "Reject",
      cancelButtonText: "Cancel",
      width: 800,
    });

    if (!confirm.isConfirmed) return;

    setBulkProcessing(true);
    try {
      const payload = {
        submission_ids: selectedArr,
        action,
        approver_level: Number(approverLevel) || Number(currentUserApproverLevel),
        approver_id: user?.user_id || user?.id || user?.email || null,
        approver_name: user?.full_name || user?.name || null,
        comment: bulkComment || null,
      };
      const res = await axios.post(`${BASE_URL}/schedule-manager/approvals/approve_submissions_bulk.php`, payload, { headers: { "Content-Type": "application/json" }, timeout: 120000 });
      if (res?.data) {
        const results = res.data.results || [];
        const ok = results.filter((r) => r.success).length;
        const fail = results.length - ok;
        const failMsgs = results.filter((r) => !r.success).slice(0, 5).map((r) => `#${r.submission_id}: ${r.message}`).join("<br/>");
        await Swal.fire({ title: "Result", html: `<strong>${ok}</strong> succeeded, <strong>${fail}</strong> failed.<br/>${fail ? `<div style="margin-top:8px;color:#b91c1c">${failMsgs}</div>` : ""}`, icon: fail ? "warning" : "success", width: 600 });
        setSelectedSubmissionIds(new Set());
        setBulkComment("");
        await loadRange(startDate, endDate, selectedBranchId);
        await fetchSubmissions(startDate, endDate, selectedBranchId);
      } else {
        throw new Error("Unexpected server response");
      }
    } catch (err) {
      console.error("Bulk action failed", err);
      Swal.fire("Error", err?.response?.data?.message || err?.message || "Bulk operation failed", "error");
    } finally {
      setBulkProcessing(false);
    }
  };

  const onCellClick = (e, emp, date) => {
    const leave = emp.approved_leaves?.[date] || leaveMap.get(`${emp.employee_id}|${date}`);
    if (leave) {
      const typeName = leave.leave_type_name || leave.leave_type_id || "Leave";
      Swal.fire({
        icon: "warning",
        title: "Cannot assign shift",
        html: `<p>${emp.full_name || `${emp.first_name} ${emp.last_name}`} is on leave on <b>${fmtDisplayDate(date)}</b> (${typeName})</p>`,
      });
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setEditingCell({
      employee_id: emp.employee_id,
      date,
      anchorRect: rect,
      employeeName: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
    });
  };

  const applyShiftChange = async (employee_id, date, work_time_id) => {
    setSaving(true);
    try {
      const payload = {
        employee_id,
        work_time_id: work_time_id ? String(work_time_id) : null,
        effective_date: date,
        end_date: date,
        recurrence_type: "none",
        recurrence_interval: 1,
        days_of_week: null,
        priority: 1,
        submitter_id: user?.user_id || user?.id || user?.email || user?.full_name || "unknown",
        submitter_name: user?.full_name || user?.name || user?.email || null,
        notes: null,
      };
      const res = await axios.post(`${BASE_URL}/schedule-manager/approvals/create_submission.php`, payload, { headers: { "Content-Type": "application/json" }, timeout: 20000 });
      if (res?.data && res.data.success) {
        Swal.fire("Submitted", res.data.message || "Submission created and awaiting approval", "success");
        await loadRange(startDate, endDate, selectedBranchId);
        await fetchSubmissions(startDate, endDate, selectedBranchId);
      } else {
        const msgFromServer = (res?.data && (res.data.message || JSON.stringify(res.data))) || "Unknown server response";
        Swal.fire("Submission failed", msgFromServer, "error");
        throw new Error(msgFromServer);
      }
    } catch (err) {
      console.error("Submission failed", err);
      const friendly = err?.response?.data?.message || err?.message || "Failed to create submission";
      Swal.fire("Error", friendly, "error");
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  // ---------- Render ----------
  return (
    <div className="w-full p-4 text-slate-800">
      {/* Top controls */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-end md:gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500">Start</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md" />
          </div>

          <div>
            <label className="block text-xs text-gray-500">End</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md" />
          </div>

          <div>
            <button onClick={() => loadRange(startDate, endDate, selectedBranchId)} disabled={loading} className="px-4 py-2 text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
              {loading ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        <div className="flex items-center w-full gap-3 ml-auto md:w-auto">
          <div className="mr-2 text-sm text-gray-600">
            Showing <span className="font-medium">{dates.length}</span> days · <span className="font-medium">{groups.reduce((acc, g) => acc + (g.employees?.length || 0), 0)}</span> employees
            {selectedBranchId ? <span className="ml-2 text-sm text-slate-600">· Branch: <span className="font-medium">{selectedBranchId === "unassigned" ? "Unassigned" : (branchesList.find(b => String(b.branch_id) === String(selectedBranchId))?.branch_name || selectedBranchId)}</span></span> : null}
          </div>

          <div>
            <select value={selectedBranchId} onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedPosition(""); }} className="p-2 border rounded-md">
              <option value="">All branches</option>
              <option value="unassigned">Unassigned</option>
              {branchesList.map((br) => <option key={br.branch_id} value={br.branch_id}>{br.branch_name}</option>)}
            </select>
          </div>

          <div>
            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="p-2 border rounded-md">
              <option value="">All positions</option>
              {positionOptions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
            </select>
          </div>

          <div>
            <input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 p-2 border rounded-md" />
          </div>

          <button
            onClick={handleNotifyAll}
            disabled={loading}
            className="px-4 py-2 font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-white animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
                Sending...
              </span>
            ) : (
              "Notify All Employees"
            )}
          </button>

          <div>
            <button
              onClick={exportVisibleXLSX}
              className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-all duration-200 bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Export XLSX
            </button>
          </div>
        </div>
      </div>

      {/* main content */}
      <div className="flex gap-4">
        <div className="flex-1 overflow-auto bg-white border rounded-md" ref={containerRef}>
          <ScheduleGrid groups={filteredGroups} dates={dates} workTimes={workTimes} onCellClick={onCellClick} />
        </div>

        <div className="flex-shrink-0 w-[450px]">
          <PendingPanel
            pendingSubmissions={pendingSubmissions}
            groups={groups}
            submissionsList={submissionsList}
            branchesList={branchesList}
            selectedBranchId={selectedBranchId}
            selectedSubmissionIds={selectedSubmissionIds}
            toggleSelectSubmission={toggleSelectSubmission}
            onSelectAllPending={onSelectAllPending}
            currentUserApproverLevel={currentUserApproverLevel}
            approverLevel={approverLevel}
            setApproverLevel={setApproverLevel}
            bulkComment={bulkComment}
            setBulkComment={setBulkComment}
            bulkApproveReject={bulkApproveReject}
            workTimes={workTimes}
          />
        </div>
      </div>

      {editingCell && (
        <PopoverEditor
          editingCell={editingCell}
          onClose={() => setEditingCell(null)}
          workTimes={workTimes}
          onCreateSubmission={(employee_id, date, work_time_id) => applyShiftChange(employee_id, date, work_time_id)}
          saving={saving}
        />
      )}

      <ConflictResolverModal open={false} onClose={() => {}} conflicts={[]} proposed={null} onAfterResolve={() => { loadRange(startDate, endDate, selectedBranchId); }} />
    </div>
  );
}




// // LayoutSMDashboard_AllRows.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import axios from "axios";
// import Swal from "sweetalert2";
// import { saveAs } from "file-saver";
// import BASE_URL from "../../../../backend/server/config";
// import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI";
// import ConflictResolverModal from "./ConflicResolveModal";
// import { useSession } from "../../../context/SessionContext";
// // import ShiftsReport from "./shiftsReport";
// import { notifyAllEmployees } from "./utils/notifyAllEmployees";

// import ScheduleGrid from "./components/ScheduleGrid";
// import PendingPanel from "./components/PendingPanel";
// import PopoverEditor from "./components/PopoverEditor";

// import { fmtDisplayDate } from "./utils/scheduleUtils";

// /**
//  * LayoutSMDashboard_AllRows
//  *
//  * - Automatically refreshes when startDate/endDate/branch change (no "Load Range" click needed)
//  * - Filters grid by branch, position and search
//  * - Export CSV will export exactly what's visible in the grid (client-side filtered)
//  * - Passes workTimes to children so shifts render
//  */
// export default function LayoutSMDashboard_AllRows() {
//   const { user } = useSession();

//   // core state
//   const [groups, setGroups] = useState([]); // raw groups from backend (each group has employees[])
//   const [dates, setDates] = useState([]); // array of YYYY-MM-DD strings returned by readSchedulesRange
//   const [loading, setLoading] = useState(false);
//   const [notifyStatus, setNotifyStatus] = useState("");

//   // date range (default 14 days)
//   const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
//   const [endDate, setEndDate] = useState(() => { const t = new Date(); t.setDate(t.getDate() + 13); return t.toISOString().slice(0, 10); });

//   // UI filters
//   const [branchesList, setBranchesList] = useState([]);
//   const [selectedBranchId, setSelectedBranchId] = useState(""); // "" = all
//   const [selectedPosition, setSelectedPosition] = useState(""); // "" = all
//   const [search, setSearch] = useState("");

//   // shifts & submissions
//   const [workTimes, setWorkTimes] = useState([]);
//   const [submissionsList, setSubmissionsList] = useState([]);
//   const [submissionsMap, setSubmissionsMap] = useState(() => new Map());

//   // approver role/level
//   const [currentUserApproverLevel, setCurrentUserApproverLevel] = useState(null);
//   const [approverLevel, setApproverLevel] = useState(2);

//   // bulk / selection
//   const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(() => new Set());
//   const [bulkComment, setBulkComment] = useState("");
//   const [bulkProcessing, setBulkProcessing] = useState(false);

//   // editor popover
//   const [editingCell, setEditingCell] = useState(null);
//   const [saving, setSaving] = useState(false);

//   // container ref for layout scrolling
//   const containerRef = useRef(null);

//   // backend employees cache (for branch filtering & unscheduled)
//   const [backendEmployeesCache, setBackendEmployeesCache] = useState({});

//   // small helper: deterministic color for shift id (used by legend - kept if children want it)
//   const colorForId = (id) => {
//     if (id == null) return "#f1f5f9";
//     const n = parseInt(String(id).replace(/\D/g, "") || "0", 10);
//     const hue = (n * 137) % 360;
//     return `hsl(${hue}deg 75% 48%)`;
//   };

//   // ---------- Load static lists (branches, workTimes, approver levels) ----------
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await axios.get(`${BASE_URL}/branches/get_branch.php`);
//         const raw = res.data?.data || [];
//         const normalized = (Array.isArray(raw) ? raw : []).map((b) => ({
//           ...b,
//           branch_id: b.branch_id ?? b.id ?? b.branchId ?? null,
//           branch_name: b.name ?? b.branch_name ?? b.branchName ?? `Branch ${b.branch_id ?? b.id ?? ""}`,
//         }));
//         setBranchesList(res.data?.success ? normalized : []);
//       } catch (err) {
//         console.error("Failed to fetch branches", err);
//         setBranchesList([]);
//       }
//     })();
//   }, []);


//   const handleNotifyAll = async () => {
//     if (!startDate || !endDate) {
//       Swal.fire("Invalid Range", "Please select a valid start and end date.", "warning");
//       return;
//     }

//     // 🗓 Convert to readable format like "October 6, 2025"
//     const readableStart = fmtDisplayDate(startDate);
//     const readableEnd = fmtDisplayDate(endDate);

//     setLoading(true);
//     setNotifyStatus("Sending notifications...");

//     // Show SweetAlert loading while sending
//     Swal.fire({
//       title: "Sending Shift Schedule to All Employees",
//       html: `Emails are being sent for range <b>${readableStart}</b> → <b>${readableEnd}</b>.<br>Please wait...`,
//       allowOutsideClick: false,
//       didOpen: () => Swal.showLoading(),
//     });

//     try {
//       // Fetch all schedules and employees in range
//       const res = await axios.get(`${BASE_URL}/schedule-manager/approvals/list_submissions.php`, {
//         params: { start_date: startDate, end_date: endDate },
//       });

//       const submissions = (res.data?.success && Array.isArray(res.data.data)) ? res.data.data : [];

//       // Include work time details (for readable shift names)
//       const workTimesMap = new Map(workTimes.map((wt) => [String(wt.id ?? wt.work_time_id), wt]));

//       const enrichedSubs = submissions.map((s) => {
//         const wt = workTimesMap.get(String(s.work_time_id));
//         return {
//           ...s,
//           shift_name: wt?.shift_name || s.shift_name || "No Shift Assigned",
//           start_time: wt?.start_time || s.start_time || "",
//           end_time: wt?.end_time || s.end_time || "",
//         };
//       });

//       // Notify all employees
//       await notifyAllEmployees({
//         startDate: readableStart, // ✅ send formatted dates to email
//         endDate: readableEnd,
//         submissions: enrichedSubs,
//         onProgress: (msg) => setNotifyStatus(msg),
//         onDone: () => setNotifyStatus("All notifications sent."),
//       });

//       Swal.fire("✅ Success", `Emails successfully sent for range ${readableStart} → ${readableEnd}`, "success");
//     } catch (err) {
//       console.error("Notify all failed", err);
//       Swal.fire("❌ Error", err.message || "Failed to send notifications.", "error");
//     } finally {
//       setLoading(false);
//     }
//   };




//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await ScheduleManagerAPI.readWorkTimes();
//         const arr = Array.isArray(res) ? res : res?.data || res?.data?.data || [];
//         const normalized = (Array.isArray(arr) ? arr : []).map((s, idx) => ({
//           id: s?.id ?? s?.work_time_id ?? idx,
//           work_time_id: s?.work_time_id ?? s?.id ?? idx,
//           shift_name: s?.shift_name ?? s?.name ?? `Shift ${idx + 1}`,
//           start_time: s?.start_time ?? s?.start ?? null,
//           end_time: s?.end_time ?? s?.end ?? null,
//           ...s,
//         }));
//         setWorkTimes(normalized);
//       } catch (err) {
//         console.error("Error loading workTimes", err);
//         setWorkTimes([]);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         const res = await axios.get(`${BASE_URL}/user_role_lists/get_role_approver_levels.php`);
//         if (!mounted) return;
//         if (res.data?.success && Array.isArray(res.data.data)) {
//           const list = res.data.data;
//           const map = {};
//           list.forEach((r) => { map[String(r.role_id || "")] = r.approver_level === null || r.approver_level === undefined ? null : Number(r.approver_level); });
//           let userLevel = null;
//           if (user) {
//             const userRoleId = user?.role_id ?? user?.roleId ?? null;
//             if (userRoleId) {
//               const key = String(userRoleId);
//               if (map[key] !== undefined) userLevel = map[key];
//             }
//             if (userLevel === null || userLevel === undefined) {
//               const uname = (user?.role_name || user?.role || "").toString().trim().toLowerCase();
//               if (uname) {
//                 for (const r of list) {
//                   if ((r.role_name || "").toString().trim().toLowerCase() === uname) {
//                     userLevel = r.approver_level === null || r.approver_level === undefined ? null : Number(r.approver_level);
//                     break;
//                   }
//                 }
//               }
//             }
//           }
//           if (userLevel === undefined) userLevel = null;
//           setCurrentUserApproverLevel(userLevel === null ? null : userLevel);
//         } else {
//           setCurrentUserApproverLevel(null);
//         }
//       } catch (err) {
//         console.error("Error loading role approver levels", err);
//         setCurrentUserApproverLevel(null);
//       }
//     })();
//     return () => { mounted = false; };
//   }, [user]);

//   useEffect(() => {
//     if (currentUserApproverLevel !== null && currentUserApproverLevel !== undefined) {
//       setApproverLevel(Number(currentUserApproverLevel));
//     }
//   }, [currentUserApproverLevel]);

//   // ---------- Helper functions ----------
//   const findWorkTimeById = (id) => {
//     if (id === null || id === undefined || id === "") return null;
//     return workTimes.find((w) => String(w.id ?? w.work_time_id) === String(id)) || null;
//   };


//   const findEmployeeNameById = (id) => {
//     if (!id) return "Unknown";
//     const sid = String(id);
//     for (const g of (groups || [])) {
//       for (const emp of (g.employees || [])) {
//         if (String(emp.employee_id) === sid) {
//           const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
//           if (name) return name;
//         }
//       }
//     }
//     const sub = (submissionsList || []).find((s) => String(s.employee_id) === sid);
//     if (sub) return sub.employee_name || sub.full_name || `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || `Emp ${sid}`;
//     return `Emp ${sid}`;
//   };

//   // fetch backend employees (used to filter branch-level and add unscheduled)
//   const fetchBackendEmployees = async (branchId = "") => {
//     const key = branchId ? String(branchId) : "all";
//     if (backendEmployeesCache[key]) return backendEmployeesCache[key];
//     try {
//       const res = await axios.get(`${BASE_URL}/branches/get_all.php`);
//       let arr = res.data?.success ? (res.data.data || []) : [];
//       arr = arr
//         .filter((e) => String(e.status || "").toLowerCase() !== "inactive")
//         .map((e) => ({ ...e, full_name: e.full_name || `${e.first_name || ""} ${e.last_name || ""}`.trim(), branch_id: e.branch_id === undefined ? null : e.branch_id, branch_name: e.branch_name ?? "" }));
//       let filtered = arr;
//       if (key === "unassigned") {
//         const validBranchIds = new Set((branchesList || []).map((b) => String(b.branch_id)));
//         filtered = arr.filter((x) => {
//           const bid = x.branch_id;
//           if (bid === null || bid === undefined) return true;
//           const s = String(bid).trim();
//           if (s === "" || Number(bid) === 0) return true;
//           if (!validBranchIds.has(String(bid))) return true;
//           return false;
//         });
//       } else if (key !== "all") {
//         filtered = arr.filter((x) => String(x.branch_id) === String(key));
//       }
//       setBackendEmployeesCache((p) => ({ ...(p || {}), [key]: filtered }));
//       return filtered;
//     } catch (err) {
//       console.error("fetchBackendEmployees error", err);
//       setBackendEmployeesCache((p) => ({ ...(p || {}), [key]: [] }));
//       return [];
//     }
//   };

//   // fetch submissions within range (and branch)
//   const fetchSubmissions = async (s = startDate, e = endDate, branchId = selectedBranchId) => {
//     try {
//       const res = await axios.get(`${BASE_URL}/schedule-manager/approvals/list_submissions.php`, {
//         params: { start_date: s, end_date: e, branch_id: branchId || undefined },
//       });
//       const subs = (res.data?.success && Array.isArray(res.data.data)) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
//       setSubmissionsList(subs || []);
//       const map = new Map();
//       (subs || []).forEach((sub) => {
//         const emp = String(sub.employee_id || "");
//         const dateKey = String(sub.effective_date || "");
//         if (!emp || !dateKey) return;
//         const k = `${emp}|${dateKey}`;
//         const existing = map.get(k);
//         if (!existing || (sub.submission_id && existing.submission_id < sub.submission_id)) {
//           map.set(k, sub);
//         }
//       });
//       setSubmissionsMap(map);
//       return map;
//     } catch (err) {
//       console.error("Failed to fetch submissions", err);
//       setSubmissionsList([]);
//       setSubmissionsMap(new Map());
//       return new Map();
//     }
//   };

//   // ---------- Load schedules range & enrich groups with backend data & submissions ----------
//   const loadRange = async (s = startDate, e = endDate, branchId = selectedBranchId) => {
//     setLoading(true);
//     try {
//       const res = await ScheduleManagerAPI.readSchedulesRange(s, e);
//       if (!res?.success || !res.data) {
//         console.error("readSchedulesRange returned unexpected:", res);
//         setGroups([]);
//         setDates([]);
//         setLoading(false);
//         return;
//       }

//       // base cleaned groups (remove inactive employees)
//       let cleaned = (res.data.groups || []).map((g) => ({ ...g, employees: (g.employees || []).filter((emp) => !emp.status || emp.status === "active") })).filter((g) => (g.employees || []).length > 0);

//       // backend employees for branch linking
//       const backendList = await fetchBackendEmployees(branchId || "");
//       const backendMap = new Map();
//       (backendList || []).forEach((b) => { if (b && b.employee_id) backendMap.set(String(b.employee_id), b); });

//       // merge backend details (branch_name/id)
//       cleaned = cleaned.map((g) => ({
//         ...g,
//         employees: (g.employees || []).map((emp) => {
//           const id = String(emp.employee_id || "");
//           const be = backendMap.get(id);
//           const base = { ...emp, full_name: emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() };
//           if (be) {
//             return { ...base, branch_id: be.branch_id ?? base.branch_id ?? null, branch_name: be.branch_name ?? base.branch_name ?? "" };
//           }
//           return base;
//         })
//       }));

//       // if branch filter, keep only employees from that branch (and add missing unscheduled employees)
//       if (branchId) {
//         cleaned = cleaned
//           .map((g) => ({ ...g, employees: (g.employees || []).filter((emp) => backendMap.has(String(emp.employee_id || ""))) }))
//           .filter((g) => (g.employees || []).length > 0);

//         // find backend employees that didn't appear in schedules (unscheduled)
//         const foundIds = new Set();
//         cleaned.forEach((g) => g.employees.forEach((emp) => foundIds.add(String(emp.employee_id))));
//         const missing = (backendList || []).filter((beEmp) => !foundIds.has(String(beEmp.employee_id)));

//         if (missing.length) {
//           const unscheduledGroup = {
//             position_id: "unscheduled_backend",
//             position_name: "Unscheduled",
//             department_name: missing[0]?.department_name || "",
//             employees: missing.map((m) => ({ ...m, full_name: m.full_name || `${m.first_name || ""} ${m.last_name || ""}`.trim(), schedules: {} })),
//           };
//           cleaned = [unscheduledGroup, ...cleaned];
//         }
//       } else {
//         cleaned = cleaned.map((g) => ({ ...g, employees: (g.employees || []).map((emp) => { const be = backendMap.get(String(emp.employee_id || "")); return { ...emp, branch_name: emp.branch_name || be?.branch_name || "", branch_id: emp.branch_id ?? be?.branch_id ?? null }; }) }));
//       }

//       setGroups(cleaned);
//       setDates(res.data.dates || []);

//       // load submissions then attach to employees as pending_submissions map
//       const subsMap = await fetchSubmissions(s, e, branchId);
//       setGroups((prevGroups) => (prevGroups || []).map((g) => ({ ...g, employees: (g.employees || []).map((emp) => {
//         const pending = {};
//         subsMap.forEach((sub, key) => {
//           const [eid, dateKey] = key.split("|");
//           if (String(eid) === String(emp.employee_id)) pending[dateKey] = sub;
//         });
//         return { ...emp, pending_submissions: pending };
//       }) })));
//     } catch (err) {
//       console.error("Error loading schedules:", err);
//       setGroups([]);
//       setDates([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // auto-load on mount and when filters change (dates/branch)
//   useEffect(() => { loadRange(); }, []); // initial
//   useEffect(() => { loadRange(startDate, endDate, selectedBranchId); }, [startDate, endDate, selectedBranchId, branchesList]); // auto apply

//   // ---------- Derived data (position options depend on current branch) ----------
//   const positionOptions = useMemo(() => {
//     const setPos = new Set();
//     (groups || []).forEach((g) => {
//       // if branch selected, only get positions that have employees inside that branch
//       if (selectedBranchId) {
//         const hasEmpInBranch = (g.employees || []).some((emp) => String(emp.branch_id ?? "") === String(selectedBranchId));
//         if (!hasEmpInBranch) return;
//       }
//       const gp = (g.position_name || g.position || "").toString().trim();
//       if (gp) setPos.add(gp);
//       (g.employees || []).forEach((emp) => {
//         const ep = (emp.position_name || emp.position || "").toString().trim();
//         if (ep) setPos.add(ep);
//       });
//     });
//     return Array.from(setPos).sort((a, b) => a.localeCompare(b));
//   }, [groups, selectedBranchId]);

//   // ---------- Filtered groups (grid) - respects branch/position/search (client-side) ----------
//   const filteredGroups = useMemo(() => {
//     const q = (search || "").trim().toLowerCase();
//     return (groups || []).map((g) => ({
//       ...g,
//       employees: (g.employees || []).filter((emp) => {
//         // branch filter
//         if (selectedBranchId) {
//           if (String(selectedBranchId) === "unassigned") {
//             const bid = emp.branch_id;
//             const validBranchIds = new Set((branchesList || []).map((b) => String(b.branch_id)));
//             const isUnassigned = (bid === null || bid === undefined) || String(bid).trim() === "" || Number(bid) === 0 || !validBranchIds.has(String(bid));
//             if (!isUnassigned) return false;
//           } else {
//             if (String(emp.branch_id ?? "") !== String(selectedBranchId)) return false;
//           }
//         }
//         // position filter
//         if (selectedPosition) {
//           const empPosition = (emp.position_name || emp.position || g.position_name || "").toString().trim().toLowerCase();
//           if (!empPosition || empPosition !== String(selectedPosition).toLowerCase()) return false;
//         }
//         // text search
//         if (q) {
//           const full = `${emp.first_name || ""} ${emp.last_name || ""} ${emp.middle_name || ""}`.toLowerCase();
//           if (!full.includes(q)) return false;
//         }
//         return true;
//       })
//     })).filter((g) => (g.employees || []).length > 0);
//   }, [groups, selectedBranchId, selectedPosition, search, branchesList]);

//   // pending submissions (client-side)
//   const pendingSubmissions = useMemo(() => {
//     return (submissionsList || []).filter((s) => {
//       const st = (s.status || "").toLowerCase();
//       return st !== "applied" && st !== "rejected";
//     });
//   }, [submissionsList]);

//   // helper to compute visible submissions for export (matches same client-side filters)
//   const computeVisibleSubmissionsForExport = () => {
//     // We export submission rows that are visible given currently selected filters
//     return (pendingSubmissions || []).filter((p) => {
//       // branch
//       if (selectedBranchId) {
//         const bid = String(p.branch_id ?? "");
//         if (String(selectedBranchId) === "unassigned") {
//           const valid = new Set((branchesList || []).map((b) => String(b.branch_id)));
//           const unassigned = bid === "" || bid === "0" || !valid.has(bid);
//           if (!unassigned) return false;
//         } else if (bid !== String(selectedBranchId)) {
//           return false;
//         }
//       }
//       // position: find group that contains this employee
//       if (selectedPosition) {
//         const g = groups.find((g2) => (g2.employees || []).some((emp) => String(emp.employee_id) === String(p.employee_id)));
//         const pos = g ? (g.position_name || "") : "";
//         if (pos.toString().trim().toLowerCase() !== selectedPosition.toString().trim().toLowerCase()) return false;
//       }
//       // search
//       if (search.trim()) {
//         const name = findEmployeeNameById(p.employee_id).toLowerCase();
//         if (!name.includes(search.trim().toLowerCase())) return false;
//       }
//       return true;
//     });
//   };

//   // ---------- CSV export (exactly what's visible on screen) ----------
//   const exportVisibleCSV = () => {
//     // Build list of visible employees from filteredGroups (so we export exactly what we display on grid)
//     const visibleGroups = filteredGroups; // already respects branch/position/search
//     // Build date headers from currently loaded `dates` (if empty, fallback to start/end range)
//     const dateHeaders = (dates && dates.length) ? dates : (() => {
//       // simple inclusive build
//       const s = new Date(`${startDate}T00:00:00`);
//       const e = new Date(`${endDate}T00:00:00`);
//       const arr = [];
//       for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) arr.push(d.toISOString().slice(0, 10));
//       return arr;
//     })();

//     // Build submissions map already available (submissionsMap) keyed by `${employee_id}|${date}`
//     const subsMap = submissionsMap || new Map();

//     // Header: Employee Name, Employee ID, Position, <date columns...>, Branch, optionally extra columns
//     const header = ["Employee Name", "Employee ID", "Position", ...dateHeaders.map(d => fmtDisplayDate(d))];

//     // Add approval/audit columns (we will add them as extra per-date metadata if available by submission)
//     // But keep separate columns for Approver and Approval Date per submission is heavy; instead include for each date cell " [status][approver]" if desired.
//     const rows = [];

//     // Iterate visible groups & employees (client-side)
//     for (const g of visibleGroups) {
//       const posName = g.position_name || "";
//       for (const emp of (g.employees || [])) {
//         const empName = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || `Emp ${emp.employee_id}`;
//         const empId = emp.employee_id ?? "";
//         // const branchName = emp.branch_name ?? "";

//         const baseRow = [empName, empId, posName];

//         // for each date, try submission first, else scheduled shift
//         for (const d of dateHeaders) {
//           const k = `${String(empId)}|${String(d)}`;
//           const sub = subsMap.get(k);
//           let cell = "-";
//           if (sub) {
//             // if submission exists and it's relevant
//             const status = sub.status || "";
//             if (sub.work_time_id === null || sub.work_time_id === "" || sub.work_time_id === undefined) {
//               // Clear shift submission
//               cell = `— Clear — [${status}]`;
//             } else {
//               const wt = findWorkTimeById(sub.work_time_id);
//               const shiftName = wt?.shift_name || sub.shift_name || `Shift ${sub.work_time_id}`;
//               const times = wt ? ` (${wt.start_time ?? ""}${wt.start_time && wt.end_time ? " - " : ""}${wt.end_time ?? ""})` : "";
//               const approverName = sub.approver_name ? ` • approved by ${sub.approver_name}` : "";
//               cell = `${shiftName}${times} [${status}]${approverName ? approverName : ""}`;
//             }
//           } else {
//             // fallback to emp.schedules for that date
//             const sched = (emp.schedules && emp.schedules[d]) ? emp.schedules[d] : null;
//             if (sched) {
//               const name = sched.shift_name || "";
//               const times = sched.start_time || sched.end_time ? ` (${sched.start_time ?? ""}${sched.start_time && sched.end_time ? " - " : ""}${sched.end_time ?? ""})` : "";
//               cell = `${name}${times}`;
//             } else {
//               cell = "-";
//             }
//           }
//           baseRow.push(cell);
//         }

//         // baseRow.push(branchName || "");
//         rows.push(baseRow);
//       }
//     }

//     if (!rows.length) {
//       Swal.fire("No data", "There is no visible data to export using current filters.", "info");
//       return;
//     }

//     // Build CSV string (UTF-8 BOM for Excel)
//     const bom = "\uFEFF";
//     const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
//     const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
//     const branchLabel = selectedBranchId ? (branchesList.find(b => String(b.branch_id) === String(selectedBranchId))?.branch_name || selectedBranchId) : "AllBranches";
//     const posLabel = selectedPosition || "AllPositions";
//     const filename = `shifts_visible_${branchLabel.replace(/\s+/g, "_")}_${posLabel.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.csv`;

//     saveAs(blob, filename);
//   };

//   // ---------- Selection helpers for pending panel ----------
//   const toggleSelectSubmission = (submission_id) => {
//     const sub = (pendingSubmissions || []).find((p) => Number(p.submission_id) === Number(submission_id));
//     if (!sub) return;
//     // check if user can act (simple check)
//     const status = (sub.status || "").toLowerCase();
//     const canApprove = (currentUserApproverLevel === 1 && status === "pending") || (currentUserApproverLevel === 2 && (status === "pending" || status === "lvl1_approved"));
//     const canReject = true;
//     if (!canApprove && !canReject) {
//       Swal.fire("Not allowed", "You cannot act on this submission (insufficient level or wrong status).", "info");
//       return;
//     }
//     setSelectedSubmissionIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(Number(submission_id))) next.delete(Number(submission_id));
//       else next.add(Number(submission_id));
//       return next;
//     });
//   };

//   const onSelectAllPending = (checked, visibleIds = []) => {
//     if (checked) {
//       // only select those allowed to be approved for the current user
//       const allowed = (pendingSubmissions || []).filter((p) => visibleIds.includes(Number(p.submission_id)) && ((currentUserApproverLevel === 1 && (p.status || "").toLowerCase() === "pending") || (currentUserApproverLevel === 2 && (["pending", "lvl1_approved"].includes((p.status || "").toLowerCase())))));
//       const allIds = new Set(allowed.map((p) => Number(p.submission_id)));
//       setSelectedSubmissionIds(allIds);
//     } else {
//       setSelectedSubmissionIds(new Set());
//     }
//   };

//   // ---------- Bulk Approve/Reject ---------- (you may wire server endpoint here)
//   const bulkApproveReject = async (action) => {
//     if (!(currentUserApproverLevel === 1 || currentUserApproverLevel === 2) && action === "approve") {
//       Swal.fire("Forbidden", "You are not an approver.", "error");
//       return;
//     }

//     const selectedArr = Array.from(selectedSubmissionIds).filter(Boolean).map((v) => Number(v));
//     if (!selectedArr.length) {
//       Swal.fire("No selection", "Select submissions to process.", "info");
//       return;
//     }

//     // Build preview table (employee, date, shift)
//     const allowedForAction = (pendingSubmissions || []).filter((p) => selectedArr.includes(Number(p.submission_id))); // we will rely on backend to enforce exact allowed ones
//     const rowsHtml = allowedForAction.map((p) => {
//       const name = findEmployeeNameById(p.employee_id);
//       const shift = (p.work_time_id === null || p.work_time_id === "") ? "— Clear —" : (findWorkTimeById(p.work_time_id)?.shift_name || p.shift_name || `Shift ${p.work_time_id}`);
//       const date = fmtDisplayDate(p.effective_date);
//       return `<div style="padding:6px 4px;border-bottom:1px solid #f3f4f6;"><strong>${name}</strong><div style="font-size:12px;color:#6b7280">${date} — ${shift}</div></div>`;
//     }).join("");

//     const confirm = await Swal.fire({
//       title: `${action === "approve" ? "Approve" : "Reject"} ${selectedArr.length} submission(s)?`,
//       html: `<div style="max-height:300px;overflow:auto;text-align:left;margin-bottom:8px">${rowsHtml}</div><div style="font-size:13px"><b>Comment:</b><br/><i>${bulkComment || "(none)"}</i></div>`,
//       showCancelButton: true,
//       confirmButtonText: action === "approve" ? "Approve" : "Reject",
//       cancelButtonText: "Cancel",
//       width: 800,
//     });

//     if (!confirm.isConfirmed) return;

//     // POST to bulk endpoint (wrap with try/catch)
//     setBulkProcessing(true);
//     try {
//       const payload = {
//         submission_ids: selectedArr,
//         action,
//         approver_level: Number(approverLevel) || Number(currentUserApproverLevel),
//         approver_id: user?.user_id || user?.id || user?.email || null,
//         approver_name: user?.full_name || user?.name || null,
//         comment: bulkComment || null,
//       };
//       const res = await axios.post(`${BASE_URL}/schedule-manager/approvals/approve_submissions_bulk.php`, payload, { headers: { "Content-Type": "application/json" }, timeout: 120000 });
//       if (res?.data) {
//         const results = res.data.results || [];
//         const ok = results.filter((r) => r.success).length;
//         const fail = results.length - ok;
//         const failMsgs = results.filter((r) => !r.success).slice(0, 5).map((r) => `#${r.submission_id}: ${r.message}`).join("<br/>");
//         await Swal.fire({ title: "Result", html: `<strong>${ok}</strong> succeeded, <strong>${fail}</strong> failed.<br/>${fail ? `<div style="margin-top:8px;color:#b91c1c">${failMsgs}</div>` : ""}`, icon: fail ? "warning" : "success", width: 600 });
//         setSelectedSubmissionIds(new Set());
//         setBulkComment("");
//         await loadRange(startDate, endDate, selectedBranchId);
//         await fetchSubmissions(startDate, endDate, selectedBranchId);
//       } else {
//         throw new Error("Unexpected server response");
//       }
//     } catch (err) {
//       console.error("Bulk action failed", err);
//       Swal.fire("Error", err?.response?.data?.message || err?.message || "Bulk operation failed", "error");
//     } finally {
//       setBulkProcessing(false);
//     }
//   };

//   // ---------- Cell click / Create submission ----------
//   const onCellClick = (e, emp, date) => {
//     const rect = e.currentTarget.getBoundingClientRect();
//     setEditingCell({ employee_id: emp.employee_id, date, anchorRect: rect, employeeName: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() });
//   };

//   const applyShiftChange = async (employee_id, date, work_time_id) => {
//     setSaving(true);
//     try {
//       const payload = {
//         employee_id,
//         work_time_id: work_time_id ? String(work_time_id) : null,
//         effective_date: date,
//         end_date: date,
//         recurrence_type: "none",
//         recurrence_interval: 1,
//         days_of_week: null,
//         priority: 1,
//         submitter_id: user?.user_id || user?.id || user?.email || user?.full_name || "unknown",
//         submitter_name: user?.full_name || user?.name || user?.email || null,
//         notes: null,
//       };
//       const res = await axios.post(`${BASE_URL}/schedule-manager/approvals/create_submission.php`, payload, { headers: { "Content-Type": "application/json" }, timeout: 20000 });
//       if (res?.data && res.data.success) {
//         Swal.fire("Submitted", res.data.message || "Submission created and awaiting approval", "success");
//         await loadRange(startDate, endDate, selectedBranchId);
//         await fetchSubmissions(startDate, endDate, selectedBranchId);
//       } else {
//         const msgFromServer = (res?.data && (res.data.message || JSON.stringify(res.data))) || "Unknown server response";
//         Swal.fire("Submission failed", msgFromServer, "error");
//         throw new Error(msgFromServer);
//       }
//     } catch (err) {
//       console.error("Submission failed", err);
//       const friendly = err?.response?.data?.message || err?.message || "Failed to create submission";
//       Swal.fire("Error", friendly, "error");
//     } finally {
//       setSaving(false);
//       setEditingCell(null);
//     }
//   };

//   // ---------- Render ----------
//   return (
//     <div className="w-full p-4 text-slate-800">
//       {/* Top controls */}
//       <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-end md:gap-4">
//         <div className="flex flex-wrap items-end gap-3">
//           <div>
//             <label className="block text-xs text-gray-500">Start</label>
//             <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md" />
//           </div>

//           <div>
//             <label className="block text-xs text-gray-500">End</label>
//             <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md" />
//           </div>

//           <div>
//             <button onClick={() => loadRange(startDate, endDate, selectedBranchId)} disabled={loading} className="px-4 py-2 text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700">
//               {loading ? "Loading..." : "Reload"}
//             </button>
//           </div>
          
          
//           {/* <ShiftsReport startDate={startDate} endDate={endDate} branchId={selectedBranchId} workTimes={workTimes} /> */}
//         </div>

//         <div className="flex items-center w-full gap-3 ml-auto md:w-auto">
//           <div className="mr-2 text-sm text-gray-600">
//             Showing <span className="font-medium">{dates.length}</span> days · <span className="font-medium">{groups.reduce((acc, g) => acc + (g.employees?.length || 0), 0)}</span> employees
//             {selectedBranchId ? <span className="ml-2 text-sm text-slate-600">· Branch: <span className="font-medium">{selectedBranchId === "unassigned" ? "Unassigned" : (branchesList.find(b => String(b.branch_id) === String(selectedBranchId))?.branch_name || selectedBranchId)}</span></span> : null}
//           </div>

//           <div>
//             <select value={selectedBranchId} onChange={(e) => { setSelectedBranchId(e.target.value); setSelectedPosition(""); }} className="p-2 border rounded-md">
//               <option value="">All branches</option>
//               <option value="unassigned">Unassigned</option>
//               {branchesList.map((br) => <option key={br.branch_id} value={br.branch_id}>{br.branch_name}</option>)}
//             </select>
//           </div>

//           <div>
//             <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="p-2 border rounded-md">
//               <option value="">All positions</option>
//               {positionOptions.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
//             </select>
//           </div>

//           <div>
//             <input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 p-2 border rounded-md" />
//           </div>



//       <button
//         onClick={handleNotifyAll}
//         disabled={loading}
//         className="px-4 py-2 font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60"
//       >
//         {loading ? (
//           <span className="flex items-center gap-2">
//             <svg
//               className="w-4 h-4 text-white animate-spin"
//               xmlns="http://www.w3.org/2000/svg"
//               fill="none"
//               viewBox="0 0 24 24"
//             >
//               <circle
//                 className="opacity-25"
//                 cx="12"
//                 cy="12"
//                 r="10"
//                 stroke="currentColor"
//                 strokeWidth="4"
//               ></circle>
//               <path
//                 className="opacity-75"
//                 fill="currentColor"
//                 d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
//               ></path>
//             </svg>
//             Sending...
//           </span>
//         ) : (
//           "Notify All Employees"
//         )}
//       </button>



//           <div>
// <button
//   onClick={exportVisibleCSV}
//   className="flex items-center gap-2 px-4 py-2 font-medium text-white transition-all duration-200 bg-green-600 rounded-lg shadow-sm hover:bg-green-700 hover:shadow-md active:scale-95"
// >
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     className="w-5 h-5"
//     fill="none"
//     viewBox="0 0 24 24"
//     stroke="currentColor"
//     strokeWidth="2"
//   >
//     <path
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       d="M12 16v-8m0 8l-3-3m3 3l3-3M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
//     />
//   </svg>
//   Export CSV
// </button>
//           </div>
//         </div>
//       </div>


//       {/* main content */}
//       <div className="flex gap-4">
//         {/* schedule grid (left, main) */}
//         <div className="flex-1 overflow-auto bg-white border rounded-md" ref={containerRef}>
//           <ScheduleGrid groups={filteredGroups} dates={dates} workTimes={workTimes} onCellClick={onCellClick} />
//         </div>

//         {/* right sidebar - Pending panel */}
//         <div className="flex-shrink-0 w-[450px]">
//           <PendingPanel
//             pendingSubmissions={pendingSubmissions}
//             groups={groups}
//             submissionsList={submissionsList}
//             branchesList={branchesList}
//             selectedBranchId={selectedBranchId}
//             selectedSubmissionIds={selectedSubmissionIds}
//             toggleSelectSubmission={toggleSelectSubmission}
//             onSelectAllPending={onSelectAllPending}
//             currentUserApproverLevel={currentUserApproverLevel}
//             approverLevel={approverLevel}
//             setApproverLevel={setApproverLevel}
//             bulkComment={bulkComment}
//             setBulkComment={setBulkComment}
//             bulkApproveReject={bulkApproveReject}
//             workTimes={workTimes}
//           />
//         </div>
//       </div>

//       {/* popover editor */}
//       {editingCell && (
//         <PopoverEditor
//           editingCell={editingCell}
//           onClose={() => setEditingCell(null)}
//           workTimes={workTimes}
//           onCreateSubmission={(employee_id, date, work_time_id) => applyShiftChange(employee_id, date, work_time_id)}
//           saving={saving}
//         />
//       )}

//       <ConflictResolverModal open={false} onClose={() => {}} conflicts={[]} proposed={null} onAfterResolve={() => { loadRange(startDate, endDate, selectedBranchId); }} />
//     </div>
//   );
// }