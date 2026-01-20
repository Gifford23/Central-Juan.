import { useEffect, useState } from 'react';
import BASE_URL from '../../../../backend/server/config';

const useDayCredit = (attendanceId) => {
  const [hoursWorked, setHoursWorked] = useState(0);
  const [creditDay, setCreditDay] = useState(0);

  useEffect(() => {
    if (!attendanceId) return;

  fetch(`${BASE_URL}/attendance/calculate_day_credit.php?id=${attendanceId}`)
.then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.text(); // get raw text first
    })
    .then(text => {
      try {
        const data = JSON.parse(text);
        setHoursWorked(data.worked_hours || 0);
        setCreditDay(data.days_credited || 0);
      } catch (err) {
        console.error('Response not valid JSON:', text);
      }
    })
    .catch((err) => {
      console.error("Error fetching credit data:", err);
      });
  }, [attendanceId]);

  return { hoursWorked, creditDay };
};

export default useDayCredit;
