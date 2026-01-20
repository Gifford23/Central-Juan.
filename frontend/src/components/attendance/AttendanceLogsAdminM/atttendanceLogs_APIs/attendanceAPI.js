import BASE_URL from "../../../../../backend/server/config";

export const deleteAttendanceRecord = async (id) => {
  const response = await fetch(`${BASE_URL}/attendance/delete_attendance.php?id=${id}`, {
    method: 'DELETE',
  });
  return await response.json();
};
