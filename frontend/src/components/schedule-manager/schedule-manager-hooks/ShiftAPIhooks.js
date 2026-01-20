// hooks/useShiftsData.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI"; // adjust path

export const useShiftsData = () => {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ScheduleManagerAPI.getShifts();
      if (res && res.success) {
        setRaw(res);
      } else if (Array.isArray(res)) {
        setRaw({
          success: true,
          work_times: res,
          breaks: [],
          work_time_break: [],
          late_tiers: [],
          late_rules: [],
          work_time_late_deduction: [],
        });
      } else {
        setError(res?.message || "Failed to load shifts");
        setRaw(null);
      }
    } catch (err) {
      setError(err?.message || "Unexpected error");
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // map breaks by id
  const breaksById = useMemo(() => {
    const map = {};
    const arr = raw?.breaks || [];
    for (const b of arr) map[String(b.id)] = b;
    return map;
  }, [raw]);

  // map work_time_id -> array of break rows (preserves original order by break_start)
  const breaksByWork = useMemo(() => {
    const map = {};
    const maps = raw?.work_time_break || [];
    for (const m of maps) {
      const wid = String(m.work_time_id);
      map[wid] = map[wid] || [];
      const b = breaksById[String(m.break_id)];
      if (b) map[wid].push(b);
    }
    // sort by break_start
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.break_start > b.break_start ? 1 : -1));
    }
    return map;
  }, [raw, breaksById]);

  // group late_rules by tier
  const lateRulesByTier = useMemo(() => {
    const map = {};
    const arr = raw?.late_rules || [];
    for (const r of arr) {
      const tid = String(r.tier_id);
      map[tid] = map[tid] || [];
      map[tid].push(r);
    }
    return map;
  }, [raw]);

  // build mapping work_time_id -> array of { rule, block_index }
  // using work_time_late_deduction bridge table (which contains tier_id and block_index)
  const lateRulesByWork = useMemo(() => {
    const map = {};
    const maps = raw?.work_time_late_deduction || [];
    for (const m of maps) {
      const wid = String(m.work_time_id);
      map[wid] = map[wid] || [];
      const tierId = String(m.tier_id);
      const blockIndex = m.block_index === null || m.block_index === undefined ? null : Number(m.block_index);
      const tierRules = lateRulesByTier[tierId] || [];
      for (const r of tierRules) {
        map[wid].push({ rule: r, block_index: blockIndex });
      }
    }
    return map;
  }, [raw, lateRulesByTier]);

  const workTimes = raw?.work_times || [];

  const getWorkTimeById = useCallback(
    (id) => workTimes.find((w) => String(w.id) === String(id)) || null,
    [workTimes]
  );

  return {
    raw,
    workTimes,
    breaksByWork,
    lateRulesByWork, // -> mapping to array of { rule, block_index }
    getWorkTimeById,
    fetch,
    loading,
    error,
  };
};
