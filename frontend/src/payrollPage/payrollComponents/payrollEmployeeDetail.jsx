import React from 'react';

function PayrollEmployeeDetail({ department, position, payrollId }) {
  return (
<div className="space-y-1 text-xs text-gray-600">
  <p><span className="font-medium">Department:</span> {department || 'N/A'}</p>
  <p><span className="font-medium">Position:</span> {position || 'N/A'}</p>
  <p><span className="font-medium">Payroll ID:</span> {payrollId || 'N/A'}</p>
</div>

  );
}

export default PayrollEmployeeDetail;
