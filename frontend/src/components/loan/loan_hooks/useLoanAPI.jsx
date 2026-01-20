// 📁 loan_hooks/useLoanAPI.js  (stable fetchLoans via useCallback)
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

const useLoanAPI = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLoans = useCallback(async (filter = null) => {
    setLoading(true);
    try {
      let url = `${BASE_URL}/loan_api/read_loans.php`;

      if (filter !== null && filter !== undefined && filter !== '') {
        if (Array.isArray(filter)) {
          url += `?loan_ids=${encodeURIComponent(filter.join(','))}`;
        } else if (typeof filter === 'number' || /^\d+$/.test(String(filter))) {
          url += `?loan_id=${encodeURIComponent(filter)}`;
        } else if (typeof filter === 'string') {
          if (/^\d+(,\d+)*$/.test(filter)) {
            url += `?loan_ids=${encodeURIComponent(filter)}`;
          } else {
            url += `?employee_id=${encodeURIComponent(filter)}`;
          }
        }
      }

      const res = await axios.get(url);
      const data = (res && res.data && res.data.data) ? res.data.data : [];

      // Only update hook state when fetching full list (no filter)
      if (filter === null || filter === undefined || filter === '') {
        setLoans(data);
      }

      return data;
    } catch (err) {
      setError(err?.message || 'API Error');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addLoan = async (loanData) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_api/create_loan.php`, loanData);
      console.log('addLoan', res);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message || 'API Error' };
    }
  };

  const updateLoan = async (loanData) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_api/update_loan.php`, loanData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message || 'API Error' };
    }
  };

  const deleteLoan = async (loan_id) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_api/delete_loan.php`, { loan_id });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message || 'API Error' };
    }
  };

  useEffect(() => {
    // initial load: populate hook state with all loans
    fetchLoans();
  }, [fetchLoans]);

  return {
    loans,
    loading,
    error,
    fetchLoans,
    addLoan,
    updateLoan,
    deleteLoan,
  };
};

export default useLoanAPI;
