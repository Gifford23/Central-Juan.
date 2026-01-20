import { useState, useEffect } from 'react';
import {
  fetchWorkTimes,
  createWorkTime,
  updateWorkTime,
  deleteWorkTime
} from '../work-timeAPI/WorkTimeAPI';

// Hook to fetch work times
export const useFetchWorkTimes = (id = null) => {
  const [workTimes, setWorkTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWorkTimes = async () => {
    setLoading(true);
    const result = await fetchWorkTimes(id);
    if (result.success) {
      setWorkTimes(result.data);
      setError(null);
    } else {
      setError(result.error || "Failed to fetch work times");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWorkTimes();
  }, [id]);

  return { workTimes, loading, error, reload: loadWorkTimes };
};

// Hook to create a new work time
export const useCreateWorkTime = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (shiftData) => {
    setLoading(true);
    const result = await createWorkTime(shiftData);
    if (!result.success) setError(result.message || result.error);
    setLoading(false);
    return result;
  };

  return { create, loading, error };
};

// Hook to update a work time
export const useUpdateWorkTime = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = async (id, shiftData) => {
    setLoading(true);
    const result = await updateWorkTime(id, shiftData);
    if (!result.success) setError(result.message || result.error);
    setLoading(false);
    return result;
  };

  return { update, loading, error };
};

// Hook to delete a work time
export const useDeleteWorkTime = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (id) => {
    setLoading(true);
    const result = await deleteWorkTime(id);
    if (!result.success) setError(result.message || result.error);
    setLoading(false);
    return result;
  };

  return { remove, loading, error };
};
