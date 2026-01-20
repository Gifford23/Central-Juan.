// src/pages/leave/leaveHooks/useLeaveRequestAPI.js
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

export const fetchLeaveRequests = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/leaveAPIAdmin/read_leave.php`);
    console.log("📥 Axios raw response:", response);
    console.log("📥 Axios data:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching leave requests:", error);
    return { data: [], error };
  }
};



export const createLeaveRequest = async (formData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/leaveAPIAdmin/create_leave_request.php`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Error creating leave request:", error);
    return { success: false, error };
  }
};

export const updateLeaveRequest = async (leaveData) => {
  try {
    const response = await axios.put(`${BASE_URL}/leaveAPIAdmin/update_leave.php`, leaveData);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating leave request:", error);
    return { success: false, error };
  }
};

export const deleteLeaveRequest = async (leave_id) => {
  try {
    const response = await axios.post(`${BASE_URL}/leaveAPIAdmin/delete_leave.php`, { leave_id });
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting leave request:", error);
    return { success: false, error };
  }
};
