import { useState, useCallback, useEffect } from "react";
import {
  getMappings,
  mapTierToShift,
  updateMapping as updateMappingAPI,
  deleteMapping as deleteMappingAPI,
  getTiers,
} from "../late-deduction-mappingAPIs/WorkTimeLateDeductionAPI";

export function useWorkTimeLateDeduction() {
  const [mappings, setMappings] = useState([]);
  const [tiers, setTiers] = useState([]);   // ✅ store tiers here
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch mappings
  const fetchMappings = useCallback(async (workTimeId = null) => {
    setLoading(true);
    try {
      const data = await getMappings(workTimeId);
      console.log("late mapping:", data);
      setMappings(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tiers (runs once when hook is mounted)
  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTiers();
      console.log("tiers:", data);
      setTiers(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tiers on mount
  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const assignTierToShift = async (data) => {
    setLoading(true);
    try {
      await mapTierToShift(data);
      console.log("late assignTierToShift:", data);
      await fetchMappings();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = async (id, data) => {
    setLoading(true);
    try {
      await updateMappingAPI(id, data);
      await fetchMappings();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const removeMapping = async (id) => {
    setLoading(true);
    try {
      await deleteMappingAPI(id);
      await fetchMappings();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    mappings,
    tiers,           // ✅ now available to your components
    loading,
    error,
    fetchMappings,
    assignTierToShift,
    updateMapping,
    removeMapping,
  };
}
