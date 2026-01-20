import { useState, useEffect } from "react";
import { 
  fetchApprovedLeavesAPI, 
  createLeaveAPI, 
  updateLeaveAPI,
  fetchEmployeesAPI,
  fetchLeaveTypesAPI,
  fetchLeaveBalanceAPI
} from "../approve_leaveAPI/approved_leaveAPI";

export function useLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null); // 🔹 new state

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetchApprovedLeavesAPI();
      console.log("✅ Approved Leaves Fetched:", res);
      setLeaves(res.data.data || []); 
    } catch (error) {
      console.error("Error fetching leaves:", error);
      setLeaves([]); 
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const empRes = await fetchEmployeesAPI();
      const typeRes = await fetchLeaveTypesAPI();
      setEmployees(empRes.data || []);
      setLeaveTypes(typeRes.data || []);
    } catch (err) {
      console.error("Error fetching dropdowns:", err);
    }
  };

  const addLeave = async (data) => {
    await createLeaveAPI(data);
    fetchLeaves();
  };

  const updateLeave = async (data) => {
    await updateLeaveAPI(data);
    fetchLeaves();
  };

  const fetchBalance = async (employee_id, leave_type_id) => {
    if (!employee_id || !leave_type_id) {
      setLeaveBalance(null);
      return;
    }
    try {
      const res = await fetchLeaveBalanceAPI(employee_id, leave_type_id);
      if (res.data.success) {
        setLeaveBalance(res.data.data);
      } else {
        setLeaveBalance(null);
      }
    } catch (err) {
      console.error("❌ Error fetching leave balance:", err);
      setLeaveBalance(null);
    }
  };

  


  useEffect(() => {
    fetchLeaves();
    fetchDropdowns();
  }, []);

  return { 
    leaves, 
    loading, 
    employees, 
    leaveTypes, 
    leaveBalance,  // 🔹 expose leaveBalance
    fetchBalance,  // 🔹 expose function to fetch balance
    addLeave, 
    updateLeave 
  };
}
