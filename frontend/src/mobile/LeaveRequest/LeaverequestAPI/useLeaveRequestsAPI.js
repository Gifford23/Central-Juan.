import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

// Create
export const createLeaveRequest = async (data) => {
  const res = await axios.post(`${BASE_URL}/leave_request_employee/create_leave_request.php`, data);
  return res.data;
};

// Read
export const fetchLeaveRequests = async (employee_id = null) => {
  const url = employee_id 
    ? `${BASE_URL}/leave_request_employee/read_leave_requests.php?employee_id=${employee_id}`
    : `${BASE_URL}/leave_request_employee/read_leave_requests.php`;
  const res = await axios.get(url);
  return res.data.data || [];
};

// Update
export const updateLeaveRequest = async (leave_id, updateData) => {
  const res = await axios.post(`${BASE_URL}/leave_request_employee/update_leave_request.php`, {
    leave_id,
    ...updateData
  });
  return res.data;
};

// Delete
export const deleteLeaveRequest = async (leave_id) => {
  const res = await axios.post(`${BASE_URL}/leave_request_employee/delete_leave_request.php`, { leave_id });
  return res.data;
};
