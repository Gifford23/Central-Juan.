import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { fmtDisplayDate, formatTimeRange, colorForId } from "../utils/scheduleUtils";

export default function PendingPanel({
  pendingSubmissions = [],
  groups = [],
  submissionsList = [],
  branchesList = [],
  selectedBranchId = "",
  selectedSubmissionIds = new Set(),
  toggleSelectSubmission = () => {},
  onSelectAllPending = () => {},
  currentUserApproverLevel = null,
  approverLevel = null,
  setApproverLevel = () => {},
  bulkComment = "",
  setBulkComment = () => {},
  bulkApproveReject = () => {},
  workTimes = [],
}) {
  const [submissionFilterName, setSubmissionFilterName] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState("pending");

  // Normalize workTimes
  const normalizedWorkTimes = useMemo(() => {
    const arr = Array.isArray(workTimes) ? workTimes : [];
    return arr.map((s, idx) => ({
      id: s?.id ?? s?.work_time_id ?? idx,
      work_time_id: s?.work_time_id ?? s?.id ?? idx,
      shift_name: s?.shift_name ?? s?.name ?? `Shift ${idx + 1}`,
      start_time: s?.start_time ?? null,
      end_time: s?.end_time ?? null,
    }));
  }, [workTimes]);

  // Find employee name
  const findEmployeeNameByIdLocal = (id) => {
    if (!id) return "Unknown";
    for (const g of groups || []) {
      for (const emp of g.employees || []) {
        if (String(emp.employee_id) === String(id))
          return `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
      }
    }
    const sub = (submissionsList || []).find((s) => String(s.employee_id) === String(id));
    if (sub)
      return (
        sub.employee_name ||
        sub.full_name ||
        `${sub.first_name || ""} ${sub.last_name || ""}`.trim() ||
        `Emp ${id}`
      );
    return `Emp ${id}`;
  };

  // Find shift name for a submission
  const findShiftName = (submission) => {
    if (!submission) return "—";
    const wtid = submission.work_time_id;
    const found = normalizedWorkTimes.find(
      (w) => String(w.work_time_id) === String(wtid)
    );
    if (found) return found.shift_name;
    if (submission.shift_name) return submission.shift_name;
    if (wtid === null || wtid === "" || wtid === undefined) return "— Clear —";
    return `Shift ${wtid}`;
  };

  // Get branch for submission
  const getBranchIdForSubmission = (submission) => {
    const eid = String(submission.employee_id ?? "");
    for (const g of groups || []) {
      for (const emp of g.employees || []) {
        if (String(emp.employee_id) === eid) return emp.branch_id ?? null;
      }
    }
    return submission.branch_id ?? null;
  };

  // --- FILTER LOGIC ---
  const visible = (pendingSubmissions || []).filter((p) => {
    const status = (p.status || "").toLowerCase();
    if (submissionFilter !== "all") {
      if (submissionFilter === "pending" && status !== "pending") return false;
      if (submissionFilter === "lvl1_approved" && status !== "lvl1_approved") return false;
    }

    if (submissionFilterName) {
      const name = (findEmployeeNameByIdLocal(p.employee_id) || "").toLowerCase();
      if (!name.includes(submissionFilterName.toLowerCase())) return false;
    }

    if (selectedBranchId) {
      const bid = getBranchIdForSubmission(p);
      if (String(selectedBranchId) === "unassigned") {
        const valid = new Set((branchesList || []).map((b) => String(b.branch_id)));
        const unassigned =
          bid === null ||
          bid === undefined ||
          String(bid).trim() === "" ||
          Number(bid) === 0 ||
          !valid.has(String(bid));
        if (!unassigned) return false;
      } else if (String(bid ?? "") !== String(selectedBranchId)) return false;
    }

    return true;
  });

  const visibleIds = visible.map((v) => Number(v.submission_id || 0));

  // 🔹 Confirm popup before bulkApproveReject
  const confirmBulkAction = async (actionType) => {
    const selected = visible.filter((p) =>
      selectedSubmissionIds.has(Number(p.submission_id))
    );

    if (selected.length === 0) {
      Swal.fire("No items selected", "Please select at least one submission.", "info");
      return;
    }

    // Build a summary table (with shift name now)
    const htmlList = selected
      .map(
        (p) =>
          `<tr>
             <td style="padding:4px 8px;border-bottom:1px solid #eee;">${findEmployeeNameByIdLocal(
               p.employee_id
             )}</td>
             <td style="padding:4px 8px;border-bottom:1px solid #eee;">${fmtDisplayDate(
               p.effective_date
             )}</td>
             <td style="padding:4px 8px;border-bottom:1px solid #eee;">${findShiftName(
               p
             )}</td>
             <td style="padding:4px 8px;border-bottom:1px solid #eee;">${p.status}</td>
           </tr>`
      )
      .join("");

    const result = await Swal.fire({
      title: `${
        actionType === "approve" ? "Approve" : "Reject"
      } ${selected.length} submission${selected.length > 1 ? "s" : ""}?`,
      html: `
        <div style="max-height:250px;overflow:auto;text-align:left">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="font-weight:bold;background:#f9f9f9">
                <th style="padding:4px 8px;">Employee</th>
                <th style="padding:4px 8px;">Date</th>
                <th style="padding:4px 8px;">Shift</th>
                <th style="padding:4px 8px;">Status</th>
              </tr>
            </thead>
            <tbody>${htmlList}</tbody>
          </table>
        </div>
        <div style="margin-top:10px;text-align:left;font-size:13px">
          <b>Comment:</b><br/>
          <i>${bulkComment || "(none)"}</i>
        </div>
      `,
      icon: actionType === "approve" ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText:
        actionType === "approve" ? "Yes, approve" : "Yes, reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: actionType === "approve" ? "#16a34a" : "#dc2626",
    });

    if (result.isConfirmed) {
      bulkApproveReject(actionType);
    }
  };

  return (
<div className="flex-1 overflow-auto">
      {/* SHIFT LEGEND */}
      <div className="p-3 bg-white border rounded-md shadow-sm">
        <h4 className="mb-2 font-semibold">Shifts</h4>
        <div className="space-y-2 overflow-auto max-h-44 mb-3">
          {normalizedWorkTimes.length === 0 && (
            <div className="text-sm text-gray-500">No shifts available</div>
          )}
          {normalizedWorkTimes.map((w) => (
            <div key={w.id} className="flex items-center gap-3">
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  backgroundColor: colorForId(w.id),
                }}
              />
              <div className="text-sm truncate">
                <div className="font-medium">{w.shift_name}</div>
                <div className="text-xs text-gray-500">
                  {formatTimeRange(w.start_time, w.end_time)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUBMISSION PANEL */}
      <div
        className="mt-3 p-3 bg-white border rounded-md shadow-sm flex flex-col"
        style={{
          position: "sticky",
          top: 0,
          maxHeight: "calc(100vh - 80px)",
          overflow: "hidden",
          alignSelf: "start",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="font-semibold">Submissions</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter name..."
              value={submissionFilterName}
              onChange={(e) => setSubmissionFilterName(e.target.value)}
              className="p-1 border rounded text-sm"
              style={{ minWidth: 140 }}
            />
            <select
              value={submissionFilter}
              onChange={(e) => setSubmissionFilter(e.target.value)}
              className="p-1 border rounded text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="lvl1_approved">Lvl1 Approved</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-slate-600 mb-3">
          Your approver level:{" "}
          <span className="font-semibold">
            {currentUserApproverLevel ? `Level ${currentUserApproverLevel}` : "None"}
          </span>
        </div>

        <div className="flex-1 overflow-auto pr-2 border-t border-gray-200 pt-2">
          {visible.length === 0 ? (
            <div className="text-sm text-gray-500">No matching submissions.</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={
                    visibleIds.length > 0 &&
                    visibleIds.every((id) => selectedSubmissionIds.has(Number(id)))
                  }
                  onChange={(e) => onSelectAllPending(e.target.checked, visibleIds)}
                />
                <span className="text-sm">Select visible ({visible.length})</span>
              </div>

              {visible.map((p) => {
                const isChecked = selectedSubmissionIds.has(Number(p.submission_id));
                const status = (p.status || "pending").toLowerCase();
                const canApproveThis =
                  (currentUserApproverLevel === 1 && status === "pending") ||
                  (currentUserApproverLevel === 2 &&
                    (status === "pending" || status === "lvl1_approved"));
                const disabledAll = !canApproveThis;

                return (
                  <label
                    key={p.submission_id}
                    className={`flex items-center gap-2 text-sm border rounded p-2 ${
                      isChecked ? "bg-indigo-50" : ""
                    } ${disabledAll ? "opacity-60" : ""}`}
                    style={{ cursor: disabledAll ? "not-allowed" : "pointer" }}
                    onClick={() => {
                      if (!disabledAll)
                        toggleSelectSubmission(Number(p.submission_id));
                      else Swal.fire("Not allowed", "You cannot act on this submission.", "info");
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabledAll}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!disabledAll)
                          toggleSelectSubmission(Number(p.submission_id));
                      }}
                    />
                    <div className="truncate">
                      <div className="font-medium">
                        {findEmployeeNameByIdLocal(p.employee_id)} •{" "}
                        {fmtDisplayDate(p.effective_date)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {findShiftName(p)} • {p.status || "pending"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <textarea
            placeholder="Optional comment..."
            value={bulkComment}
            onChange={(e) => setBulkComment(e.target.value)}
            className="w-full p-2 border rounded h-20 text-sm"
          />

          <div className="flex gap-2">
            <button
              onClick={() => confirmBulkAction("approve")}
              className="flex-1 px-3 py-2 text-white bg-green-600 rounded"
            >
              Approve
            </button>
            <button
              onClick={() => confirmBulkAction("reject")}
              className="flex-1 px-3 py-2 text-white bg-red-600 rounded"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PendingPanel.propTypes = {
  pendingSubmissions: PropTypes.array.isRequired,
  groups: PropTypes.array.isRequired,
  submissionsList: PropTypes.array.isRequired,
  branchesList: PropTypes.array.isRequired,
  selectedBranchId: PropTypes.string,
  selectedSubmissionIds: PropTypes.instanceOf(Set).isRequired,
  toggleSelectSubmission: PropTypes.func.isRequired,
  onSelectAllPending: PropTypes.func.isRequired,
  currentUserApproverLevel: PropTypes.number,
  approverLevel: PropTypes.number,
  setApproverLevel: PropTypes.func,
  bulkComment: PropTypes.string,
  setBulkComment: PropTypes.func.isRequired,
  bulkApproveReject: PropTypes.func.isRequired,
  workTimes: PropTypes.array,
};
