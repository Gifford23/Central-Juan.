import React from "react";
import { useFetchWorkTimes, useDeleteWorkTime } from "../work-timeHooks/useWorkTimeAPI";

const WorkTimeTable = ({ onEdit, onView }) => {
  const { workTimes, loading, error, reload } = useFetchWorkTimes();
  const { remove } = useDeleteWorkTime();

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    const result = await remove(id);
    if (result.success) {
      alert("✅ Shift deleted successfully");
      reload();
    } else {
      alert("❌ Failed to delete shift");
    }
  };

  if (loading) return <p>⏳ Loading shifts...</p>;
  if (error) return <p>❌ {error}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workTimes.map((shift) => (
        <div
          key={shift.id}
          className="flex flex-col justify-between p-4 bg-white shadow-md rounded-xl"
        >
          <div>
            <h3 className="text-lg font-semibold">{shift.shift_name}</h3>
            <p className="text-sm text-gray-600">
              {shift.start_time} → {shift.end_time}
            </p>
            <p className="text-xs text-gray-500">
              Valid In: {shift.valid_in_start} - {shift.valid_in_end}
            </p>
            <p className="text-xs text-gray-500">
              Valid Out: {shift.valid_out_start} - {shift.valid_out_end}
            </p>
            {shift.is_default ? (
              <span className="font-bold text-green-600">Default</span>
            ) : (
              <span className="text-gray-400">Not Default</span>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onView(shift)}
              className="px-3 py-1 text-sm text-white bg-blue-500 rounded-lg"
            >
              View
            </button>
            <button
              onClick={() => onEdit(shift)}
              className="px-3 py-1 text-sm text-white bg-yellow-500 rounded-lg"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(shift.id)}
              className="px-3 py-1 text-sm text-white bg-red-500 rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkTimeTable;
