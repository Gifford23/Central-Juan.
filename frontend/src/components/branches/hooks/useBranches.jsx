import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

export function useBranches() {
  // branches list
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // employees cache: { [branch_id]: [employee...] }
  const [employeesMap, setEmployeesMap] = useState({});
  // per-branch loading / error states
  const [loadingEmployeesMap, setLoadingEmployeesMap] = useState({});
  const [errorEmployeesMap, setErrorEmployeesMap] = useState({});

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/branches/get_branch.php`);
      if (res.data?.success) setBranches(res.data.data || []);
      else setBranches([]);
    } catch (err) {
      console.error('fetchBranches error', err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const createBranch = async (payload) => {
    const res = await axios.post(`${BASE_URL}/branches/create_branch.php`, payload);
    if (res.data?.success) {
      await fetchBranches();
      return res.data;
    }
    throw new Error(res.data?.message || 'Create failed');
  };

  const updateBranch = async (payload) => {
    const res = await axios.post(`${BASE_URL}/branches/update_branch.php`, payload);
    if (res.data?.success) {
      // refresh branches and clear employee cache for the updated branch (if any)
      await fetchBranches();
      if (payload.branch_id) {
        setEmployeesMap((p) => ({ ...p, [payload.branch_id]: undefined }));
      }
      return res.data;
    }
    throw new Error(res.data?.message || 'Update failed');
  };

  const deleteBranch = async (branch_id) => {
    const res = await axios.post(`${BASE_URL}/branches/delete_branch.php`, { branch_id });
    if (res.data?.success) {
      await fetchBranches();
      // remove cached employees for deleted branch
      setEmployeesMap((p) => {
        const copy = { ...p };
        delete copy[branch_id];
        return copy;
      });
      return res.data;
    }
    throw new Error(res.data?.message || 'Delete failed');
  };

  /**
   * Fetch employees for a specific branch_id and cache results in employeesMap.
   * If branch_id is falsy, this will fetch all employees with branch assigned (backend supports that).
   */
  const fetchEmployeesForBranch = useCallback(async (branch_id) => {
    const key = branch_id || 'all';
    // if already loaded, don't re-fetch (caller can still force by clearing employeesMap[key] first)
    if (employeesMap[key]) return employeesMap[key];

    setLoadingEmployeesMap((p) => ({ ...p, [key]: true }));
    setErrorEmployeesMap((p) => ({ ...p, [key]: null }));

    try {
      const res = await axios.get(`${BASE_URL}/branches/get_employees_by_branch.php`, {
        params: branch_id ? { branch_id } : {},
      });

      if (res.data?.success) {
        setEmployeesMap((p) => ({ ...p, [key]: res.data.data || [] }));
        return res.data.data || [];
      } else {
        setEmployeesMap((p) => ({ ...p, [key]: [] }));
        setErrorEmployeesMap((p) => ({ ...p, [key]: res.data?.message || 'No data' }));
        return [];
      }
    } catch (err) {
      console.error('fetchEmployeesForBranch error', err);
      setEmployeesMap((p) => ({ ...p, [key]: [] }));
      setErrorEmployeesMap((p) => ({ ...p, [key]: err.message || 'Error' }));
      return [];
    } finally {
      setLoadingEmployeesMap((p) => ({ ...p, [key]: false }));
    }
  }, [employeesMap]);

  return {
    branches,
    loading,
    fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch,

    // employees helpers
    employeesMap, // access cached employees via employeesMap[branch_id]
    loadingEmployeesMap,
    errorEmployeesMap,
    fetchEmployeesForBranch,
  };
}
