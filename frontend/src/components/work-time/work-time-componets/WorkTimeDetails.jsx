import React from "react";

const WorkTimeDetails = ({ shift, onClose }) => {
  if (!shift) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded-xl">
        <h2 className="mb-4 text-xl font-semibold">{shift.shift_name}</h2>
        <p>
          <strong>Shift:</strong> {shift.start_time} → {shift.end_time}
        </p>
        <p>
          <strong>Valid In:</strong> {shift.valid_in_start} - {shift.valid_in_end}
        </p>
        <p>
          <strong>Valid Out:</strong> {shift.valid_out_start} - {shift.valid_out_end}
        </p>
        <p>
          <strong>Default:</strong> {shift.is_default ? "Yes ✅" : "No ❌"}
        </p>
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkTimeDetails;
