import axios from 'axios';
import BASE_URL from "../../../../../backend/server/config";

export const createAttendance = (formData) => {
  return axios.post(
    `${BASE_URL}/mobile/time_in/create_attendance.php`,
    formData,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};


export const updateAttendance = async (formData) => {
  return await axios.post(`${BASE_URL}/mobile/time_in/update_attendance.php`, formData);
};
