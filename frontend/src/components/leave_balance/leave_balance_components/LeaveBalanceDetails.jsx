import React from "react";

export default function LeaveBalanceDetails({ balances }) {
  if (!balances.length) {
    return <p className="p-2 text-sm text-gray-500">No leave records found.</p>;
  }

  return (
    <div className="grid gap-2 mt-2">
      {balances.map((lv, idx) => (
        <div
          key={idx}
          className="p-3 transition border rounded-lg bg-gray-50 hover:bg-gray-100"
        >
          <p className="font-medium">{lv.leave_name}</p>
          <div className="flex justify-between mt-1 text-sm text-gray-600">
            <span>Limit: {lv.leave_limit}</span>
            <span>Used: {lv.leave_used}</span>
            <span>Usable: {lv.leave_balance}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
