import React from "react";

const OvertimeFilter = ({ statusFilter, onStatusChange, requestCounts }) => {
  const statusOptions = ["All", "Pending", "Approved", "Rejected"];

  const safeCounts = {
    Pending: requestCounts.Pending || 0,
    Approved: requestCounts.Approved || 0,
    Rejected: requestCounts.Rejected || 0,
  };

  return (
    <div
      className="flex flex-wrap gap-4 mb-6 w-full"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      }}
    >
      {statusOptions.map((option) => {
        const isActive = statusFilter === option;

        const borderColor =
          option === "All"
            ? "border-blue-600"
            : option === "Pending"
            ? "border-yellow-600"
            : option === "Approved"
            ? "border-green-600"
            : "border-red-600";

        const bgColor = isActive
          ? option === "All"
            ? "bg-blue-200"
            : option === "Pending"
            ? "bg-yellow-200"
            : option === "Approved"
            ? "bg-green-200"
            : "bg-red-200"
          : option === "All"
          ? "bg-blue-100"
          : option === "Pending"
          ? "bg-yellow-100"
          : option === "Approved"
          ? "bg-green-100"
          : "bg-red-100";

        const badgeColor =
          option === "All"
            ? "bg-blue-500/50 border-blue-600"
            : option === "Pending"
            ? "bg-yellow-500/50 border-yellow-600"
            : option === "Approved"
            ? "bg-green-500/50 border-green-600"
            : "bg-red-500/50 border-red-600";

        const count =
          option === "All"
            ? safeCounts.Pending + safeCounts.Approved + safeCounts.Rejected
            : safeCounts[option];

        return (
          <button
            key={option}
            onClick={() => onStatusChange(option)}
            className={`flex flex-row items-center justify-between border rounded-xl px-4 py-3 shadow-md cursor-pointer transition-all duration-200 ease-in-out
              ${bgColor} ${borderColor}
              ${isActive ? "ring-2 ring-offset-2 ring-black/40" : ""}
            `}
          >
            <div
              className={`flex border px-3 py-1 rounded-md font-semibold text-sm ${badgeColor}`}
            >
              {option}
            </div>
            <div className="text-3xl italic font-normal">{count}</div>
          </button>
        );
      })}
    </div>
  );
};

export default OvertimeFilter;
