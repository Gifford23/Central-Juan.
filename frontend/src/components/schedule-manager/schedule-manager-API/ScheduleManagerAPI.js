import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

const ScheduleManagerAPI = {
  readSchedules: async (employee_id = null) => {
    try {
      let url = `${BASE_URL}/schedule-manager/read-mp.php`;
      if (employee_id) url += `?employee_id=${employee_id}`;
      const res = await axios.get(url);
      console.log("read schedule", res);
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  createSchedule: async (data) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/schedule-manager/create-sm.php`,
        data
      );
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  updateScheduleDays: async ({ schedule_id, remove_days }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/schedule-manager/update-days-sm.php`,
        { schedule_id, remove_days }
      );
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  updateSchedule: async (data) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/schedule-manager/update-mp.php`,
        data
      );
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  deleteSchedule: async (schedule_id) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/schedule-manager/delete-mp.php`,
        { schedule_id }
      );
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  readWorkTimes: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/work_time/read_work_time.php`);
      return res.data.data || [];
    } catch (error) {
      console.error("Error fetching work times:", error);
      return [];
    }
  },

  readEmployees: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/employeesSide/employees.php`);
      let employees = [];

      if (Array.isArray(res.data)) {
        employees = res.data;
      } else {
        employees = res.data.data || [];
      }

      // ✅ only active employees
      return employees.filter((emp) => emp.status === "active");
    } catch (error) {
      console.error("Error fetching employees:", error);
      return [];
    }
  },

  fetchEmployeeSchedules: async (employee_id) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/schedule-manager/read-employee-schedule.php?employee_id=${employee_id}`
      );
      return response.data;
    } catch (err) {
      console.error("Error fetching employee schedule", err);
      return { success: false, schedules: [] };
    }
  },

  fetchAllSchedules: async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/schedule-manager/read-all-schedule.php`
      );
      return response.data;
    } catch (err) {
      console.error("Error fetching all schedules", err);
      return { success: false, schedules: [] };
    }
  },

  getShifts: async () => {
    try {
      const url = `${BASE_URL}/schedule-manager/get_shifts.php`;
      const res = await axios.get(url);
      return res.data;
    } catch (error) {
      console.error("ShiftAPI.getShifts error:", error);
      return { success: false, message: error?.message || "Network error" };
    }
  },

    readSchedulesRange: async (start, end) => {
    try {
      const url = `${BASE_URL}/schedule-manager/read-schedules-range.php?start=${start}&end=${end}`;
      const res = await axios.get(url);
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  upsertEmployeeShift: async ({ employee_id, schedule_date, work_time_id, priority = 1 }) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/schedule-manager/upsert-employee-shift.php`,
        { employee_id, schedule_date, work_time_id, priority }
      );
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  readEmployeesGrouped: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/schedule-manager/get-employee-grouped.php`);
            console.log('readEmployeesGrouped', res);
      return res.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
    
  },

    // Add inside ScheduleManagerAPI object
  getBreaksByWorkTimeId: async (work_time_id, { debug = false } = {}) => {
    try {
      if (!work_time_id) return { success: false, message: 'work_time_id required', breaks: [] };
      const qs = new URLSearchParams({ work_time_id: String(work_time_id) });
      if (debug) qs.set('debug', '1');
      const url = `${BASE_URL}/schedule-manager/get_breaks_by_work_time.php?${qs.toString()}`;
      const res = await axios.get(url);
      console.log('getBreaksByWorkTimeId', res);
      // endpoint returns { success:true, breaks: [...] }
      if (res && res.data && res.data.success) {
        return { success: true, breaks: res.data.breaks || [], debug: res.data.debug || null };
      }
      return { success: false, message: res?.data?.error || res?.data?.message || 'no data', breaks: [] };
    } catch (error) {
      console.error('getBreaksByWorkTimeId error:', error);
      return { success: false, message: error.message || 'Network error', breaks: [] };
    }
  },


readLeaveTypes: async () => {
  try {
    const res = await axios.get(`${BASE_URL}/schedule-manager/get_all_L.php`);
    const arr = res.data?.data ?? [];
    return { success: true, data: arr };
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return { success: false, message: error?.message || "Network error" };
  }
},

fetchLeavesRange: async (start, end, branchId = null) => {
  try {
    const params = { start_date: start, end_date: end };
    if (branchId) params.branch_id = branchId;
    const res = await axios.get(`${BASE_URL}/schedule-manager/list_range.php`, { params });
    const rows = res.data?.data ?? [];
    return { success: true, data: rows };
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return { success: false, message: error?.message || "Network error" };
  }
},



  
};


export default ScheduleManagerAPI;





// import axios from "axios";
// import BASE_URL from "../../../../backend/server/config";

// const ScheduleManagerAPI = {
//   readSchedules: async (employee_id = null) => {
//     try {
//       let url = `${BASE_URL}/schedule-manager/read-mp.php`;
//       if (employee_id) url += `?employee_id=${employee_id}`;
//       const res = await axios.get(url);
//       console.log("read schedule", res);
//       return res.data;
//     } catch (error) {
//       return { success: false, message: error.message };
//     }
//   },

//   createSchedule: async (data) => {
//     try {
//       const res = await axios.post(
//         `${BASE_URL}/schedule-manager/create-sm.php`,
//         data
//       );
//       return res.data;
//     } catch (error) {
//       return { success: false, message: error.message };
//     }
//   },

//   updateScheduleDays: async ({ schedule_id, remove_days }) => {
//     try {
//       const res = await axios.post(
//         `${BASE_URL}/schedule-manager/update-days-sm.php`,
//         { schedule_id, remove_days }
//       );
//       return res.data;
//     } catch (error) {
//       return { success: false, message: error.message };
//     }
//   },

//   updateSchedule: async (data) => {
//     try {
//       const res = await axios.post(
//         `${BASE_URL}/schedule-manager/update-mp.php`,
//         data
//       );
//       return res.data;
//     } catch (error) {
//       return { success: false, message: error.message };
//     }
//   },

//   deleteSchedule: async (schedule_id) => {
//     try {
//       const res = await axios.post(
//         `${BASE_URL}/schedule-manager/delete-mp.php`,
//         { schedule_id }
//       );
//       return res.data;
//     } catch (error) {
//       return { success: false, message: error.message };
//     }
//   },

//   readWorkTimes: async () => {
//     try {
//       const res = await axios.get(`${BASE_URL}/work_time/read_work_time.php`);
//       return res.data.data || [];
//     } catch (error) {
//       console.error("Error fetching work times:", error);
//       return [];
//     }
//   },

//   readEmployees: async () => {
//     try {
//       const res = await axios.get(`${BASE_URL}/employeesSide/employees.php`);
//       let employees = [];

//       if (Array.isArray(res.data)) {
//         employees = res.data;
//       } else {
//         employees = res.data.data || [];
//       }

//       // ✅ only active employees
//       return employees.filter((emp) => emp.status === "active");
//     } catch (error) {
//       console.error("Error fetching employees:", error);
//       return [];
//     }
//   },

//   fetchEmployeeSchedules: async (employee_id) => {
//     try {
//       const response = await axios.get(
//         `${BASE_URL}/schedule-manager/read-employee-schedule.php?employee_id=${employee_id}`
//       );
//       return response.data;
//     } catch (err) {
//       console.error("Error fetching employee schedule", err);
//       return { success: false, schedules: [] };
//     }
//   },

//   fetchAllSchedules: async () => {
//     try {
//       const response = await axios.get(
//         `${BASE_URL}/schedule-manager/read-all-schedule.php`
//       );
//       return response.data;
//     } catch (err) {
//       console.error("Error fetching all schedules", err);
//       return { success: false, schedules: [] };
//     }
//   },
// };

// export default ScheduleManagerAPI;
