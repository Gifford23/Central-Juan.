// 📁 loan_hooks/useLoanPaymentHistoryAPI.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

const useLoanPaymentHistoryAPI = (loan_id) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/loan_payment_history_api/read_payment_history.php?loan_id=${loan_id}`);
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch payment history", err);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_payment_history_api/create_payment.php`, paymentData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const updatePayment = async (paymentData) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_payment_history_api/update_payment.php`, paymentData);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deletePayment = async (payment_id) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_payment_history_api/delete_payment.php`, { loan_payment_history_id: payment_id });
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  useEffect(() => {
    if (loan_id) fetchPayments();
  }, [loan_id]);

  return {
    payments,
    loading,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
  };
};

export default useLoanPaymentHistoryAPI;
