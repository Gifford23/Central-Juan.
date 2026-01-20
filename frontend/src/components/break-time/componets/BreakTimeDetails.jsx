import React from "react";

const BreakTimeDetails = ({ breakData, onClose }) => {
  if (!breakData) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
      <div className="p-6 bg-white rounded-lg w-96">
        <h3 className="mb-4 text-lg font-bold">Break Details</h3>

        <ul className="space-y-2">
          <li><strong>Name:</strong> {breakData.break_name}</li>
          <li><strong>Start:</strong> {breakData.break_start}</li>
          <li><strong>End:</strong> {breakData.break_end}</li>
          <li><strong>Minutes:</strong> {breakData.break_minutes}</li>
          <li><strong>Valid In:</strong> {breakData.valid_break_in_start} - {breakData.valid_break_in_end}</li>
          <li><strong>Valid Out:</strong> {breakData.valid_break_out_start} - {breakData.valid_break_out_end}</li>
        </ul>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white bg-blue-600 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakTimeDetails;
