import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

export const fetchApprovedLeavesAPI = () => {
  return axios.get(`${BASE_URL}/employee_leave/read_approved_leave.php`);
};

export const createLeaveAPI = (leaveData) => {
  return axios.post(`${BASE_URL}/employee_leave/create_approved_leave.php`, leaveData);
};

export const updateLeaveAPI = (leaveData) => {
  return axios.put(`${BASE_URL}/employee_leave/update_approved_leave.php`, leaveData);
};


// Dropdown data
export const fetchEmployeesAPI = () => {
  return axios.get(`${BASE_URL}/employee_leave/read_employee.php`);
};

export const fetchLeaveTypesAPI = () => {
  return axios.get(`${BASE_URL}/employee_leave/read_leave_types.php`);
};

export const fetchLeaveBalanceAPI = (employee_id, leave_type_id) => {
  return axios.get(
    `${BASE_URL}/employee_leave/read_leave_balance.php?employee_id=${employee_id}&leave_type_id=${leave_type_id}`
  );
};
