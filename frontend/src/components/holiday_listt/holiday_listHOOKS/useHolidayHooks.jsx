import { useState, useEffect } from 'react';
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from '../holiday_listAPI/Holiday_listAPI';

// utils/formatHolidayDate.js
export function formatHolidayDate(dateStr) {
  if (!dateStr) return "N/A";

  const [year, month, day] = dateStr.split("-");

  // Handle recurring (0000 year) holidays
  if (year === "0000") {
    // Use a dummy year to create a valid date object
    const dummyDate = new Date(`2023-${month}-${day}`);
    if (isNaN(dummyDate)) return "Invalid date";

    const options = { month: "short", day: "numeric" };
    const formatted = dummyDate.toLocaleDateString("en-US", options).replace(",", "");
    return `${formatted}`;
  }

  // Try to parse the actual date
  const date = new Date(dateStr);
  if (isNaN(date)) return "Invalid date";

  const options = { month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options).replace(",", "");
}


export default function useHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await getHolidays();
      setHolidays(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const addHoliday = async (holiday) => {
    const res = await createHoliday(holiday);
    if (res.success) loadHolidays();
    else throw new Error(res.message);
  };

  const editHoliday = async (holiday) => {
    const res = await updateHoliday(holiday);
    if (res.success) loadHolidays();
    else throw new Error(res.message);
  };

  const removeHoliday = async (id) => {
    const res = await deleteHoliday(id);
    if (res.success) loadHolidays();
    else throw new Error(res.message);
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  return { holidays, loading, error, addHoliday, editHoliday, removeHoliday };
}
