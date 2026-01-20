import React from 'react';
import { formatHolidayDate } from '../holiday_listHOOKS/useHolidayHooks';

export default function HolidayTable({ holidays, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-300 table-auto md:text-base">
        <thead>
          <tr className="text-center bg-gray-200">
            <th className="p-2 border">Holiday Name</th>
            <th className="p-2 border">Holiday Date</th>
            <th className="p-2 border">Holiday Year</th>
            <th className="p-2 border">Credit Day</th>
            <th className="p-2 border">Holiday Type</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {holidays.length > 0 ? (
            holidays.map((holiday) => (
              <tr
                key={holiday.holiday_id}
                className="text-center transition-colors hover:bg-gray-100"
              >
                <td className="p-2 border">{holiday.holiday_name || "N/A"}</td>
<td className="p-2 border">{formatHolidayDate(holiday.holiday_date)}</td>

                <td className="p-2 border">
                  {holiday.holiday_year ? (
                    holiday.holiday_year
                  ) : (
                    <span className="italic text-gray-500">Recurring</span>
                  )}
                </td>
                <td className="p-2 border">{holiday.credit_day ?? 0}</td>
                <td className="p-2 capitalize border">
                  {holiday.holiday_type || "Regular"}
                </td>
                <td className="p-2 space-x-2 border">
                  <button
                    onClick={() => onEdit(holiday)}
                    className="px-2 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(holiday.holiday_id)}
                    className="px-2 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="p-4 text-center text-gray-500">
                No holidays found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

