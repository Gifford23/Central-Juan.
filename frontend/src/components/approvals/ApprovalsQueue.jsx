import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import BASE_URL from "../../../backend/server/config";
import { useSession } from "../../context/SessionContext";

// Improved Approvals queue UI (single-file React component)
// - TailwindCSS utility classes assumed
// - Uses framer-motion for light micro-interactions
// - Keep Swal for approve/reject confirmations (already used in your app)

export default function ApprovalsQueue() {
  const { user } = useSession();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState(null); // selected submission for details drawer

  const role = (user?.role || "").toString().toUpperCase();
  const canDoLevel1 = role === "MANAGER" || role === "SUPERVISOR" || role === "ADMIN";
  const canDoLevel2 = role === "ADMIN" || role === "HR";

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/schedule-manager/approvals/list_submissions.php`);
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setSubmissions(rows);
    } catch (err) {
      console.error("Failed to load submissions", err);
      Swal.fire("Error", "Failed to load submissions. See console/network for details.", "error");
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doAction = async (submission, action, approver_level) => {
    const label = action === "approve" ? "Approve" : "Reject";

    const { value: comment, isDismissed } = await Swal.fire({
      title: `${label} submission?`,
      input: "text",
      inputPlaceholder: "Optional comment",
      inputValue: "",
      html: `<div class=\"text-sm text-left\">${label} submission <strong>#${submission.submission_id}</strong> for <strong>${submission.employee_id}</strong> on <strong>${submission.effective_date}</strong></div>`,
      showCancelButton: true,
    });

    if (isDismissed) return;

    try {
      const payload = {
        submission_id: submission.submission_id,
        action,
        approver_level,
        approver_id: user?.user_id || user?.id || user?.email || user?.full_name || "unknown",
        approver_name: user?.full_name || user?.name || user?.email || null,
        comment: comment || null,
      };

      const res = await axios.post(`${BASE_URL}/schedule-manager/approvals/approve_submission.php`, payload);
      if (res.data?.success) {
        Swal.fire("Done", res.data.message || "Action completed", "success");
        await fetchList();
      } else {
        Swal.fire("Error", res.data?.message || "Failed", "error");
      }
    } catch (err) {
      console.error("Approve failed", err);
      Swal.fire("Error", (err?.response?.data?.message) || err.message || "Server error", "error");
    }
  };

  const statusOptions = useMemo(() => ["all", "pending", "lvl1_approved", "lvl2_approved", "applied", "rejected"], []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter !== "all" && (s.status || "").toLowerCase() !== statusFilter) return false;
      if (!q) return true;
      // search across a few fields
      return [
        String(s.submission_id || ""),
        String(s.employee_id || ""),
        String(s.submitter_name || s.submitter_id || ""),
        String(s.effective_date || ""),
        String(s.work_time_id || ""),
      ].some((val) => val.toLowerCase().includes(q));
    });
  }, [submissions, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    // clamp page when data length changes
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const renderStatus = (s) => {
    const st = (s || "").toLowerCase();
    if (!st) return <span className="text-sm text-gray-500">-</span>;
    let bg = "bg-yellow-100 text-yellow-800";
    if (st === "pending") bg = "bg-yellow-100 text-yellow-800";
    else if (st === "lvl1_approved") bg = "bg-blue-100 text-blue-800";
    else if (st === "lvl2_approved") bg = "bg-indigo-100 text-indigo-800";
    else if (st === "applied") bg = "bg-green-100 text-green-800";
    else if (st === "rejected") bg = "bg-red-100 text-red-800";

    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bg}`}>{s}</span>;
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Approvals Queue</h2>
          <p className="text-sm text-gray-500">Manage pending schedule submissions and approvals.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchList}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Per page</label>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ID, employee, submitter or date..."
          className="flex-1 border rounded-md px-3 py-2 text-sm shadow-sm"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          {statusOptions.map((st) => (
            <option key={st} value={st}>{st === 'all' ? 'All statuses' : st}</option>
          ))}
        </select>

        <div className="text-sm text-gray-500">Showing {filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="w-full overflow-auto">
          <table className="w-full min-w-[900px] table-auto">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-600">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Shift</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitter</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                // skeleton rows while loading
                Array.from({ length: perPage }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-40" /></td>
                    <td className="px-4 py-3"><div className="h-8 bg-gray-200 rounded w-32" /></td>
                  </tr>
                ))
              )}

              {!loading && pageData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No submissions found.</td>
                </tr>
              )}

              {!loading && pageData.map((s) => {
                const notes = s.notes ?? s.comment ?? "";
                return (
                  <motion.tr key={s.submission_id || `${s.employee_id}-${s.effective_date}`} whileHover={{ scale: 1.001 }} className="border-t">
                    <td className="px-4 py-3 align-top">{s.submission_id}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium">{s.employee_id}</div>
                      <div className="text-xs text-gray-500">{s.employee_name}</div>
                    </td>
                    <td className="px-4 py-3 align-top">{s.effective_date}{s.end_date && s.end_date !== s.effective_date ? ` → ${s.end_date}` : ""}</td>
                    <td className="px-4 py-3 align-top">{s.work_time_id ?? "-"}</td>
                    <td className="px-4 py-3 align-top">{renderStatus(s.status)}</td>
                    <td className="px-4 py-3 align-top">{s.submitter_name || s.submitter_id}</td>
                    <td className="px-4 py-3 align-top">{s.created_at}</td>
                    <td className="px-4 py-3 align-top max-w-xs">
                      <div className="text-xs text-gray-600 truncate max-w-[260px]">{notes}</div>
                      <button
                        onClick={() => setSelected(s)}
                        className="mt-1 text-xs text-indigo-600 hover:underline"
                      >View</button>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        {canDoLevel1 && (s.status === "pending") && (
                          <button onClick={() => doAction(s, "approve", 1)} className="text-sm px-3 py-1 rounded-md bg-blue-600 text-white">Approve L1</button>
                        )}

                        {canDoLevel2 && (["pending", "lvl1_approved"].includes(s.status)) && (
                          <button onClick={() => doAction(s, "approve", 2)} className="text-sm px-3 py-1 rounded-md bg-green-600 text-white">Approve L2</button>
                        )}

                        {(canDoLevel1 || canDoLevel2) && s.status !== "rejected" && s.status !== "applied" && (
                          <button onClick={() => doAction(s, "reject", canDoLevel2 ? 2 : 1)} className="text-sm px-3 py-1 rounded-md bg-red-600 text-white">Reject</button>
                        )}

                        <button onClick={() => setSelected(s)} className="text-sm px-3 py-1 rounded-md border">Details</button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* pagination controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
          <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Prev</button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >Next</button>
          </div>
        </div>
      </div>

      {/* details drawer */}
      {selected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={() => setSelected(null)} />
          <motion.aside initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }} className="w-[420px] bg-white shadow-xl p-6 border-l">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Submission #{selected.submission_id}</h3>
                <div className="text-sm text-gray-500">Employee: {selected.employee_id} — {selected.employee_name}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400">Close</button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div><strong>Date:</strong> {selected.effective_date}{selected.end_date ? ` → ${selected.end_date}` : ''}</div>
              <div><strong>Shift:</strong> {selected.work_time_id ?? '-'}</div>
              <div><strong>Status:</strong> {renderStatus(selected.status)}</div>
              <div><strong>Submitter:</strong> {selected.submitter_name || selected.submitter_id}</div>
              <div><strong>Created:</strong> {selected.created_at}</div>
              <div><strong>Notes:</strong>
                <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{selected.notes ?? selected.comment ?? '-'}</div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              {canDoLevel1 && selected.status === 'pending' && (
                <button onClick={() => doAction(selected, 'approve', 1)} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">Approve L1</button>
              )}
              {canDoLevel2 && (["pending", "lvl1_approved"].includes(selected.status)) && (
                <button onClick={() => doAction(selected, 'approve', 2)} className="flex-1 px-4 py-2 bg-green-600 text-white rounded">Approve L2</button>
              )}
              {(canDoLevel1 || canDoLevel2) && selected.status !== 'rejected' && selected.status !== 'applied' && (
                <button onClick={() => doAction(selected, 'reject', canDoLevel2 ? 2 : 1)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded">Reject</button>
              )}
            </div>

          </motion.aside>
        </motion.div>
      )}
    </div>
  );
}
