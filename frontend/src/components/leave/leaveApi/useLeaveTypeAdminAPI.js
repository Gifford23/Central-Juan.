import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

// Create a new leave type
export const createLeaveTypeAdmin = async (leaveTypeData) => {
  try {
    const response = await axios.post(`${BASE_URL}/leaveTypeAdminCrud/create_leave_typeAdmin.php`, leaveTypeData);
    return response.data;
  } catch (err) {
    console.error('Failed to create leave type:', err);
    throw err;
  }
};

// Fetch all leave types
export const fetchLeaveTypesAdmin = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/leaveTypeAdminCrud/read_leave_typeAdmin.php`);
    return response.data || [];
  } catch (err) {
    console.error('Failed to fetch leave types:', err);
    throw err;
  }
};

// Update an existing leave type
export const updateLeaveTypeAdmin = async (leave_type_id, updatedData) => {
  try {
    const response = await axios.post(`${BASE_URL}/leaveTypeAdminCrud/update_leave_typeAdmin.php`, {
      leave_type_id,
      ...updatedData,
    });
    return response.data;
  } catch (err) {
    console.error('Failed to update leave type:', err);
    throw err;
  }
};

// Delete a leave type
export const deleteLeaveTypeAdmin = async (leave_type_id) => {
  try {
    const response = await axios.post(`${BASE_URL}/leaveTypeAdminCrud/delete_leave_typeAdmin.php`, {
      leave_type_id,
    });
    return response.data;
  } catch (err) {
    console.error('Failed to delete leave type:', err);
    throw err;
  }
};
