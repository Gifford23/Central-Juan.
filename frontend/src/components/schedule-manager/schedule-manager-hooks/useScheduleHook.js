// src/components/schedule-manager/schedule-manager-hooks/useScheduleHook.js
import { useState, useEffect, useCallback, useMemo } from "react";
import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI"; // adjust path if needed

// Fetch schedules for an employee or all depending on API
export const useScheduleHook = (employee_id = null) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ScheduleManagerAPI.readSchedules(employee_id);
      if (res && res.success && Array.isArray(res.data)) {
        setSchedules(res.data);
      } else if (Array.isArray(res)) {
        // legacy: API returned array directly
        setSchedules(res);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error("useScheduleHook.fetchSchedules error", err);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [employee_id]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return { schedules, fetchSchedules, loading };
};

// create schedule
export const useCreateSchedule = () => {
  const [loading, setLoading] = useState(false);

  const createSchedule = async (data) => {
    setLoading(true);
    try {
      const res = await ScheduleManagerAPI.createSchedule(data);
      return res;
    } catch (err) {
      console.error("useCreateSchedule error", err);
      return { success: false, message: err.message || "Network error" };
    } finally {
      setLoading(false);
    }
  };

  return { createSchedule, loading };
};

// update schedule
export const useUpdateSchedule = () => {
  const [loading, setLoading] = useState(false);

  const updateSchedule = async (data) => {
    setLoading(true);
    try {
      const res = await ScheduleManagerAPI.updateSchedule(data);
      return res;
    } catch (err) {
      console.error("useUpdateSchedule error", err);
      return { success: false, message: err.message || "Network error" };
    } finally {
      setLoading(false);
    }
  };

  return { updateSchedule, loading };
};

// delete schedule
export const useDeleteSchedule = () => {
  const [loading, setLoading] = useState(false);

  const deleteSchedule = async (schedule_id) => {
    setLoading(true);
    try {
      const res = await ScheduleManagerAPI.deleteSchedule(schedule_id);
      return res;
    } catch (err) {
      console.error("useDeleteSchedule error", err);
      return { success: false, message: err.message || "Network error" };
    } finally {
      setLoading(false);
    }
  };

  return { deleteSchedule, loading };
};

// employee schedules
export const useEmployeeSchedule = (employeeId) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (!employeeId) {
          setSchedules([]);
          return;
        }
        const res = await ScheduleManagerAPI.fetchEmployeeSchedules(employeeId);
        if (res && res.success && Array.isArray(res.schedules)) {
          if (mounted) setSchedules(res.schedules);
        } else {
          if (mounted) setSchedules([]);
        }
      } catch (err) {
        console.error("useEmployeeSchedule error", err);
        if (mounted) setSchedules([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [employeeId]);

  return { schedules, loading };
};

// all schedules
export const useAllSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await ScheduleManagerAPI.fetchAllSchedules();
        if (res && res.success && Array.isArray(res.schedules)) {
          if (mounted) setSchedules(res.schedules);
        } else {
          if (mounted) setSchedules([]);
        }
      } catch (err) {
        console.error("useAllSchedules error", err);
        if (mounted) setSchedules([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return { schedules, loading };
};

// /* --------- SHIFT DATA hook (optional/extra) --------- */
// // If you use this in your app, export it as well. Keep name consistent.
// import ShiftAPI from "../schedule-manager-API/scheduleManagerAPI"; // same service, alias for clarity
// import { useRef } from "react";

// export const useShiftsData = () => {
//   const [raw, setRaw] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const mountedRef = useRef(true);

//   const fetch = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await ShiftAPI.getShifts();
//       if (res && res.success) {
//         setRaw(res);
//       } else if (Array.isArray(res)) {
//         setRaw({
//           success: true,
//           work_times: res,
//           breaks: [],
//           work_time_break: [],
//           late_tiers: [],
//           late_rules: [],
//           work_time_late_deduction: [],
//         });
//       } else {
//         setError(res?.message || "Failed to load shifts");
//         setRaw(null);
//       }
//     } catch (err) {
//       setError(err?.message || "Unexpected error");
//       setRaw(null);
//     } finally {
//       if (mountedRef.current) setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     mountedRef.current = true;
//     fetch();
//     return () => { mountedRef.current = false; };
//   }, [fetch]);

//   const breaksById = useMemo(() => {
//     const map = {};
//     const breaks = raw?.breaks || [];
//     for (const b of breaks) map[String(b.id)] = b;
//     return map;
//   }, [raw]);

//   const breaksByWork = useMemo(() => {
//     const map = {};
//     const maps = raw?.work_time_break || [];
//     for (const m of maps) {
//       const wid = String(m.work_time_id);
//       map[wid] = map[wid] || [];
//       const b = breaksById[String(m.break_id)];
//       if (b) map[wid].push(b);
//     }
//     return map;
//   }, [raw, breaksById]);

//   const lateRulesByTier = useMemo(() => {
//     const map = {};
//     const rules = raw?.late_rules || [];
//     for (const r of rules) {
//       const tid = String(r.tier_id);
//       map[tid] = map[tid] || [];
//       map[tid].push(r);
//     }
//     return map;
//   }, [raw]);

//   const lateRulesByWork = useMemo(() => {
//     const map = {};
//     const maps = raw?.work_time_late_deduction || [];
//     for (const m of maps) {
//       const wid = String(m.work_time_id);
//       map[wid] = map[wid] || [];
//       const tierId = String(m.tier_id);
//       const tierRules = lateRulesByTier[tierId] || [];
//       map[wid].push(...tierRules);
//     }
//     return map;
//   }, [raw, lateRulesByTier]);

//   const workTimes = raw?.work_times || [];

//   const getWorkTimeById = useCallback((id) => workTimes.find((w) => String(w.id) === String(id)) || null, [workTimes]);

//   return { raw, workTimes, breaksByWork, lateRulesByWork, getWorkTimeById, fetch, loading, error };
// };


//working 9/26/20
// import { useState, useEffect } from "react";
// import ScheduleManagerAPI from "../schedule-manager-API/scheduleManagerAPI";

// export const useScheduleHook = (employee_id = null) => {
//   const [schedules, setSchedules] = useState([]);
//   const [loading, setLoading] = useState(false);

// const fetchSchedules = async () => {
//   setLoading(true);
//   const res = await ScheduleManagerAPI.readSchedules(employee_id);

//   if (res.success && Array.isArray(res.data)) {
//     setSchedules(res.data);
//   } else if (Array.isArray(res)) {
//     setSchedules(res); // in case API already returns an array
//   } else {
//     setSchedules([]); // fallback to empty
//   }

//   setLoading(false);
// };


//   useEffect(() => {
//     fetchSchedules();
//   }, [employee_id]); // re-fetch if employee_id changes

//   return { schedules, fetchSchedules, loading };
// };

// export const useCreateSchedule = () => {
//   const [loading, setLoading] = useState(false);

//   const createSchedule = async (data) => {
//     setLoading(true);
//     const res = await ScheduleManagerAPI.createSchedule(data);
//     setLoading(false);
//     return res;
//   };

//   return { createSchedule, loading };
// };

// export const useUpdateSchedule = () => {
//   const [loading, setLoading] = useState(false);

//   const updateSchedule = async (data) => {
//     setLoading(true);
//     const res = await ScheduleManagerAPI.updateSchedule(data);
//     setLoading(false);
//     return res;
//   };

//   return { updateSchedule, loading };
// };

// export const useDeleteSchedule = () => {
//   const [loading, setLoading] = useState(false);

//   const deleteSchedule = async (schedule_id) => {
//     setLoading(true);
//     const res = await ScheduleManagerAPI.deleteSchedule(schedule_id);
//     setLoading(false);
//     return res;
//   };

//   return { deleteSchedule, loading };
// };

// export const useEmployeeSchedule = (employeeId) => {
//   const [schedules, setSchedules] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (employeeId) {
//       fetchEmployeeSchedules(employeeId).then((res) => {
//         if (res.success) setSchedules(res.schedules);
//         setLoading(false);
//       });
//     }
//   }, [employeeId]);

//   return { schedules, loading };
// };

// export const useAllSchedules = () => {
//   const [schedules, setSchedules] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchAllSchedules().then((res) => {
//       if (res.success) setSchedules(res.schedules);
//       setLoading(false);
//     });
//   }, []);

//   return { schedules, loading };
// };



