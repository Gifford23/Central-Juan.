// components/PopoverEditor.jsx
import React from "react";
import PropTypes from "prop-types";

const fmtReadableDate = (dateStr) => {
  const d = new Date(dateStr);
  const options = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  const parts = d.toLocaleDateString("en-US", options).split(" ");
  return `${parts[0].replace(",", "")}-${parts[1]}. ${parts[2].replace(",", "")}, ${parts[3]}`;
};

export default function PopoverEditor({ editingCell, onClose, workTimes, onCreateSubmission, saving }) {
  if (!editingCell) return null;

  // Calculate popover position
  const popoverWidth = 320;
  const popoverHeight = 200; // approx height; adjust as needed
  const padding = 10;

  const anchorRect = editingCell.anchorRect || { left: 200, bottom: 200, top: 200 };
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Horizontal: keep inside viewport
  let left = Math.min(anchorRect.left, viewportWidth - popoverWidth - padding);
  left = Math.max(padding, left);

  // Vertical: prefer below, flip above if not enough space
  let top = anchorRect.bottom + padding;
  if (anchorRect.bottom + popoverHeight + padding > viewportHeight) {
    top = Math.max(anchorRect.top - popoverHeight - padding, padding);
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="absolute p-3 bg-white border rounded-md shadow-lg pointer-events-auto"
        style={{ left, top, minWidth: popoverWidth }}
      >
        <div className="mb-1 font-medium">
          Create submission • {fmtReadableDate(editingCell.date)}
        </div>
        <div className="mb-2 text-xs text-gray-500">Employee: {editingCell.employeeName}</div>

        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value || null;
              onCreateSubmission(editingCell.employee_id, editingCell.date, v);
            }}
            className="flex-1 p-2 border rounded-md"
            disabled={saving}
          >
            <option value="">— Create submission to clear shift —</option>
            {workTimes.map((w) => (
              <option key={w.id || w.work_time_id} value={w.id || w.work_time_id}>
                {w.shift_name} {w.start_time ? `(${w.start_time}-${w.end_time})` : ""}
              </option>
            ))}
          </select>

          <button onClick={onClose} disabled={saving} className="px-3 py-2 border rounded-md">
            Close
          </button>
        </div>

        {saving && <div className="mt-2 text-xs text-gray-500">Submitting...</div>}
      </div>
    </div>
  );
}

PopoverEditor.propTypes = {
  editingCell: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  workTimes: PropTypes.array.isRequired,
  onCreateSubmission: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};
