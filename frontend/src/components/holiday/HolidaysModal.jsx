import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import BASE_URL from '../../../backend/server/config';

const HolidaysModal = ({ isOpen, onClose, holiday, onSave }) => {
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [creditedDays, setCreditedDays] = useState(1);
  const [holidayType, setHolidayType] = useState("Regular");

  useEffect(() => {
    if (holiday) {
      setHolidayName(holiday.holiday_name);
      setHolidayDate(holiday.holiday_date);
      setCreditedDays(holiday.credited_days);
      setHolidayType(holiday.holiday_type);
    } else {
      setHolidayName("");
      setHolidayDate("");
      setCreditedDays(1);
      setHolidayType("Regular");
    }
  }, [holiday]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = holiday ? "PUT" : "POST";
    const url = holiday ? `${BASE_URL}/philippine_holidays/update_philippine_holidays.php` 
                        : `${BASE_URL}/philippine_holidays/add_philippine_holidays.php`;

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: holiday ? holiday.id : undefined,
        holiday_name: holidayName,
        holiday_date: holidayDate,
        credited_days: creditedDays,
        holiday_type: holidayType,
      }),
    });

    const data = await response.json();
    if (data.success) {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: `Holiday ${holiday ? "updated" : "added"} successfully.`,
      });
      onSave();
      onClose();
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: data.message || "Failed to save holiday.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">{holiday ? "Edit Holiday" : "Add Holiday"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Holiday Name</label>
            <input
              type="text"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Holiday Date</label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Credited Days</label>
            <input
              type="number"
              value={creditedDays}
              onChange={(e) => setCreditedDays(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              min="1"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Holiday Type</label>
            <select
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            >
              <option value="Regular">Regular</option>
              <option value="Special Non-Working">Special Non-Working</option>
              <option value="Special Working">Special Working</option>
            </select>
          </div>
 <div className="flex justify-end">
            <button type="button" onClick={onClose} className="mr-2 bg-gray-300 text-gray-800 px-4 py-2 rounded">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{holiday ? "Update" : "Add"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HolidaysModal;