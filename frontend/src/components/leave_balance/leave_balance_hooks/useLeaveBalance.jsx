import { useState, useEffect } from "react";
import { fetchLeaveBalancesAPI, fetchLeaveBalancesByEmployeeAPI } from "../leave_balanceAPI/leave_balanceAPI";

export const useLeaveBalances = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchLeaveBalancesAPI()
      .then(res => setBalances(res.data.data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { balances, loading, error };
};

export const useLeaveBalancesByEmployee = (employeeId) => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    fetchLeaveBalancesByEmployeeAPI(employeeId)
      .then(res => setBalances(res.data.data))
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [employeeId]);

  return { balances, loading, error };
};
