// 📁 loan_hooks/useLoanSkipAPI.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

const useLoanSkipAPI = () => {
  const [skipRequests, setSkipRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSkipRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/loan_skip_request_api/read_skip_request.php`);
      if (response.data.success) {
        setSkipRequests(response.data.data);
      } else {
        setError(response.data.message || "Failed to fetch skip requests");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const createSkipRequest = async (payload) => {
    try {
      const response = await axios.post(`${BASE_URL}/loan_skip_request_api/create_skip_request.php`, payload);
      return response.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updateSkipStatus = async (skip_id, status) => {
    try {
      const response = await axios.post(`${BASE_URL}/loan_skip_request_api/update_skip_status.php`, {
        skip_id,
        status
      });
      return response.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deleteSkipRequest = async (skip_id) => {
    try {
      const response = await axios.post(`${BASE_URL}/loan_skip_request_api/delete_skip_request.php`, {
        skip_id
      });
      return response.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  useEffect(() => {
    fetchSkipRequests();
  }, []);

  return {
    skipRequests,
    loading,
    error,
    fetchSkipRequests,
    createSkipRequest,
    updateSkipStatus,
    deleteSkipRequest,
  };
};

export default useLoanSkipAPI;
