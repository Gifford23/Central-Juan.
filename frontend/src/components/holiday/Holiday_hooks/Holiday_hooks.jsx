// Holiday_hooks.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

export const useHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHolidays = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/holiday/get_holiday.php`);
      if (res.data.success) setHolidays(res.data.data);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  const createHoliday = async (data) => {
    const res = await axios.post(`${BASE_URL}/holiday/create_holiday.php`, data);
    return res.data;
  };

  const updateHoliday = async (data) => {
    const res = await axios.post(`${BASE_URL}/holiday/edit_holiday.php`, data);
    return res.data;
  };

  const deleteHoliday = async (holiday_id) => {
    const res = await axios.post(`${BASE_URL}/holiday/delete_holiday.php`, { holiday_id });
    return res.data;
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  return {
    holidays,
    loading,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    fetchHolidays
  };
};
