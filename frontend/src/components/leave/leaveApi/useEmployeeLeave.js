import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';
// Create a new employee leave
export const createEmployeeLeave = async (leaveData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/employee_leaves/create_employee_leave.php`,
      leaveData
    );
    return response.data;
  } catch (err) {
    console.error('Failed to create leave:', err);
    throw err;
  }
};

// Fetch employee leaves (optional filters)
export const fetchEmployeeLeaves = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const response = await axios.get(
      `${BASE_URL}/employee_leaves/read_employee_leave.php${params ? `?${params}` : ''}`
    );
    return response.data || [];
  } catch (err) {
    console.error('Failed to fetch leaves:', err);
    throw err;
  }
};

// Update employee leave
export const updateEmployeeLeave = async (leave_id, updatedData) => {
  try {
    const response = await axios.put(
      `${BASE_URL}/employee_leaves/update_employee_leave.php`,
      { leave_id, ...updatedData }
    );
    return response.data;
  } catch (err) {
    console.error('Failed to update leave:', err);
    throw err;
  }
};

// Delete employee leave
export const deleteEmployeeLeave = async (leave_id) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/employee_leaves/delete_employee_leave.php`,
      { data: { leave_id } }
    );
    return response.data;
  } catch (err) {
    console.error('Failed to delete leave:', err);
    throw err;
  }
};
