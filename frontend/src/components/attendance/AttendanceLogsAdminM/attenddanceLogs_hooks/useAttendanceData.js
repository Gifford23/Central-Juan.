import { useState, useEffect } from 'react';
import BASE_URL from '../../../../../backend/server/config';
import Swal from 'sweetalert2';

const useAttendanceData = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await response.json();
      if (data.success) {
        setAttendanceData(data.data);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops!',
          text: data.message || 'Failed to fetch attendance data.',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Error fetching attendance: ' + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  return {
    attendanceData,
    loading,
    fetchAttendance,
  };
};

export default useAttendanceData;
