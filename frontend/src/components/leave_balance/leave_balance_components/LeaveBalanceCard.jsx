import React from "react";
import LeaveBalanceDetails from "./LeaveBalanceDetails";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function LeaveBalanceCard({
  employeeId,
  info,
  isOpen,
  onToggle,
  balances,
  detailLoading,
}) {
  return (
    <div className="flex flex-col justify-between p-4 bg-white border shadow rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{info.employee_name}</h2>
          <p className="text-sm text-gray-600">
            Total Usable:{" "}
            <span className="font-bold">{info.total_balance}</span>
          </p>
        </div>
        <button
          onClick={() => onToggle(employeeId)}
          className="flex items-center gap-1 px-3 py-1 text-white transition bg-blue-500 rounded-xl hover:bg-blue-600"
        >
          {isOpen ? "Hide" : "View"}{" "}
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3">
          {detailLoading ? (
            <div className="p-4 text-gray-500 animate-pulse">Loading details...</div>
          ) : (
            <LeaveBalanceDetails balances={balances} />
          )}
        </div>
      )}
    </div>
  );
}
