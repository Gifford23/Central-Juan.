// src/components/WorkTimeBreakUI/useWorkTimeBreakAPI.js
import { useState, useEffect } from "react";
import {
  fetchWorkTimeBreaks,
  createWorkTimeBreak,
  deleteWorkTimeBreak,
} from "../work-time-breakAPI/WorkTimeBreakAPI";

// ✅ Hook: Fetch all mappings
export const useFetchWorkTimeBreaks = (work_time_id = null) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await fetchWorkTimeBreaks(work_time_id);
      console.log("Fetched work time break:", result);
      if (result.success) setData(result.data);
      setLoading(false);
    };
    loadData();
  }, [work_time_id]);

  return { data, loading, setData };
};

// ✅ Hook: Create new mapping
export const useCreateWorkTimeBreak = () => {
  const [loading, setLoading] = useState(false);

  const create = async (work_time_id, break_id) => {
    setLoading(true);
    const result = await createWorkTimeBreak({ work_time_id, break_id });
    setLoading(false);
    return result;
  };

  return { create, loading };
};

// ✅ Hook: Delete mapping
export const useDeleteWorkTimeBreak = () => {
  const [loading, setLoading] = useState(false);

  const remove = async (id) => {
    setLoading(true);
    const result = await deleteWorkTimeBreak(id);
    setLoading(false);
    return result;
  };

  return { remove, loading };
};
