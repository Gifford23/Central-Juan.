import { useState } from 'react';
import axios from 'axios';
import BASE_URL from '../../../backend/server/config'; // adjust path as needed

const useDTRSummary = () => {
  const [dtrData, setDtrData] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  const fetchDtrSummary = async (employeeId, dateFrom, dateUntil) => {
    setLoadingId(employeeId); // Optional: can show loading state per employee

    try {
      const response = await axios.get(`${BASE_URL}/payroll/get_attendance_summary.php`, {
        params: {
          employee_id: employeeId,
          date_from: dateFrom,
          date_until: dateUntil,
        }
      });

      setDtrData((prev) => ({
        ...prev,
        [employeeId]: response.data,
      }));
    } catch (error) {
      console.error("Failed to fetch DTR summary:", error);
    } finally {
      setLoadingId(null);
    }
  };

  return {
    dtrData,
    loadingId,
    fetchDtrSummary,
  };
};

export default useDTRSummary;
