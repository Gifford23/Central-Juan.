import { useState, useEffect } from "react";
import { ScheduleAPI } from "../schedule-manager-API/schedule-managerAPI";

// ✅ Manage schedule fetching (per employee or all)
export const useSchedules = (employeeId = null) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = async () => {
    setLoading(true);
    const data = await ScheduleAPI.read(employeeId);
    if (data.success) {
      /**
       * The BE returns:
       * [
       *   { employee_id, employee_name, shifts: [ {schedule_id, work_time_id, ...} ] }
       * ]
       * So we store directly to state.
       */
      setSchedules(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, [employeeId]);

  return { schedules, fetchSchedules, loading };
};



// ✅ Hook for creating multiple schedules in one go
export const useCreateSchedule = () => {
  const [loading, setLoading] = useState(false);

  const createSchedule = async (payload) => {
    setLoading(true);
    try {
      // payload: { employee_id, work_time_id: [1,2,3], effective_date, ... }
      const result = await ScheduleAPI.create(payload);
      return result; // 🚨 return raw response (includes success + message)
    } finally {
      setLoading(false);
    }
  };

  return { createSchedule, loading };
};


// ✅ Hook for deleting specific schedule (per schedule_id)
export const useDeleteSchedule = () => {
  const [loading, setLoading] = useState(false);

  const deleteSchedule = async (scheduleId) => {
    setLoading(true);
    const result = await ScheduleAPI.delete(scheduleId);
    setLoading(false);
    return result;
  };

  return { deleteSchedule, loading };
};
