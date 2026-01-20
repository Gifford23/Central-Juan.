import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

export default function PayrollGrid({ data, openDropdownId, onToggleActions, onToggleDetails, onDelete, selectedPayroll, onSelectPayroll }) {
  return (
    <div className='flex gap-x-2 rounded-[15px] mt-4'>
      <div className='payroll-employee-sidelist overflow-y-scroll rounded-[15px]'>
        {data.map(payroll => (
          <div key={payroll.payroll_id} className="relative flex flex-col p-4 bg-gray-200 payroll_employees_info">
            {/* simplified for brevity: include actions & details toggles */}
          </div>
        ))}
      </div>
      <div className="grow p-10 bg-gray-200 rounded-[15px]">
        {selectedPayroll && (
          <div className='flex flex-col w-full p-4 bg-red-50'>
            <h3 className="font-bold">Selected Payroll Details:</h3>
            <p><strong>Total Days:</strong> {selectedPayroll.total_days}</p>
            <p><strong>Total Salary:</strong> {selectedPayroll.total_basic_salary}</p>
          </div>
        )}
      </div>
    </div>
  );
}