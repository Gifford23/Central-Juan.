import React, { useState } from "react";
import { useLeaveBalances, useLeaveBalancesByEmployee } from "../leave_balance_hooks/useLeaveBalance";
import LeaveBalanceCard from "./LeaveBalanceCard";

export default function LeaveBalanceList() {
  const { balances, loading, error } = useLeaveBalances();
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { balances: employeeBalances, loading: detailLoading } =
    useLeaveBalancesByEmployee(selectedEmployee);

  if (loading) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-32 p-4 bg-gray-100 border shadow rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error)
    return (
      <p className="p-4 text-center text-red-500">
        Error loading leave balances: {error.message}
      </p>
    );

  // Group balances by employee
  const grouped = balances.reduce((acc, item) => {
    if (!acc[item.employee_id]) {
      acc[item.employee_id] = { employee_name: item.employee_name, total_balance: 0 };
    }
    acc[item.employee_id].total_balance += parseFloat(item.leave_balance);
    return acc;
  }, {});

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(grouped).map(([employeeId, info]) => (
        <LeaveBalanceCard
          key={employeeId}
          employeeId={employeeId}
          info={info}
          isOpen={selectedEmployee === employeeId}
          onToggle={(id) =>
            setSelectedEmployee(selectedEmployee === id ? null : id)
          }
          balances={selectedEmployee === employeeId ? employeeBalances : []}
          detailLoading={detailLoading && selectedEmployee === employeeId}
        />
      ))}
    </div>
  );
}
