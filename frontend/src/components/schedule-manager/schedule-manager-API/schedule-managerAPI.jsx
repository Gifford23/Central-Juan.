import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

export const ScheduleAPI = {
  // ✅ Create one or many schedules for an employee
  create: async (payload) => {
    try {
      // payload can now include `work_time_id` as an array
      const { data } = await axios.post(
        `${BASE_URL}/schedule-manager/create-schedule-manager.php`,
        payload
      );
      return data;
    } catch (error) {
      console.error("Error creating schedule:", error);
      throw error;
    }
  },

  // ✅ Read schedules (all employees or specific employee)
  read: async (employeeId = null) => {
    try {
      const url = employeeId
        ? `${BASE_URL}/schedule-manager/read-schedule-manager.php?employee_id=${employeeId}`
        : `${BASE_URL}/schedule-manager/read-schedule-manager.php`;
      const { data } = await axios.get(url);
      return data;
    } catch (error) {
      console.error("Error fetching schedules:", error);
      throw error;
    }
  },

  // ✅ Delete a specific schedule (per schedule_id, not per employee)
  delete: async (scheduleId) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/schedule-manager/delete-schedule-manager.php`,
        { schedule_id: scheduleId }
      );
      return data;
    } catch (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  },

  // ✅ Update a specific schedule (optional, if you’ll implement update.php)
  update: async (scheduleId, payload) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/schedule-manager/update-schedule-manager.php`,
        { schedule_id: scheduleId, ...payload }
      );
      return data;
    } catch (error) {
      console.error("Error updating schedule:", error);
      throw error;
    }
  },
};
