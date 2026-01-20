import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

// Fetch all leave balances with employee names
export const fetchLeaveBalancesAPI = () => {
  return axios.get(`${BASE_URL}/leave_balances/read_leave_balance.php`);
};

export const fetchLeaveBalancesByEmployeeAPI = (employeeId) => {
  return axios.get(`${BASE_URL}/leave_balances/read_leave_balance_by_employee.php?employee_id=${employeeId}`);
};