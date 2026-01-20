import React, { useState, useEffect } from 'react';

export default function HolidayForm({ onSubmit, initialData, onCancel }) {
  const [holidayName, setHolidayName] = useState('');
  const [month, setMonth] = useState('1');
  const [day, setDay] = useState('1');
  const [year, setYear] = useState('');
  const [creditDay, setCreditDay] = useState(0);
  const [holidayType, setHolidayType] = useState('Regular');

  useEffect(() => {
  if (initialData) {
    setHolidayName(initialData.holiday_name);
    const [initMonth, initDay] = initialData.holiday_date.split('-');
    setMonth(parseInt(initMonth).toString());
    setDay(parseInt(initDay).toString());
    setCreditDay(initialData.credit_day);
    setHolidayType(initialData.holiday_type || 'Regular');
  } else {
    setHolidayName('');
    setMonth('1');
    setDay('1');
    setCreditDay(0);
    setHolidayType('Regular');
  }
}, [initialData]);


  const handleSubmit = (e) => {
  e.preventDefault();

  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");

  const holidayDate = `${paddedMonth}-${paddedDay}`;

  onSubmit({
    holiday_id: initialData?.holiday_id,
    holiday_name: holidayName,
    holiday_date: holidayDate,
    credit_day: parseFloat(creditDay),
    holiday_type: holidayType,
    holiday_year: null, // Or remove this field completely if not needed
  });
};


  return (
    <form onSubmit={handleSubmit} className="p-4 mb-4 border rounded">
      <div className="mb-2">
        <label>Holiday Name</label>
        <input
          type="text"
          value={holidayName}
          onChange={(e) => setHolidayName(e.target.value)}
          required
          className="w-full p-1 border"
        />
      </div>

      <div className="mb-2">
        <label>Date</label>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-1/3 p-1 border"
            required
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, '0')} - {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-1/3 p-1 border"
            required
          >
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {String(i + 1).padStart(2, '0')}
              </option>
            ))}
          </select>
          {/* Uncomment if you want year input */}
          {/* <input
            type="number"
            min="1900"
            max="2100"
            placeholder="Year (optional)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-1/3 p-1 border"
          /> */}
        </div>
        <small className="text-gray-500">Leave year empty for recurring holiday</small>
      </div>

      <div className="mb-2">
        <label>Credit Day</label>
        <input
          type="number"
          step="any"
          value={creditDay}
          onChange={(e) => setCreditDay(e.target.value)}
          required
          className="w-full p-1 border"
          min="0"
        />
      </div>

      <div className="mb-2">
        <label>Holiday Type</label>
        <select
          value={holidayType}
          onChange={(e) => setHolidayType(e.target.value)}
          className="w-full p-1 border"
          required
        >
          <option value="Regular">Regular</option>
          <option value="Special Non-Working">Special Non-Working</option>
          <option value="Special Working">Special Working</option>
        </select>
      </div>

      <button type="submit" className="px-3 py-1 mr-2 text-white bg-blue-600">
        {initialData ? 'Update' : 'Add'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="px-3 py-1 bg-gray-400">
          Cancel
        </button>
      )}
    </form>
  );
}
