import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

// Fetch all shifts or a specific shift
export const fetchWorkTimes = async (id = null) => {
  try {
    const url = id ? `${BASE_URL}/work_time/read_work_time.php?id=${id}` : `${BASE_URL}/work_time/read_work_time.php`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching work times:", error);
    return { success: false, data: [], error };
  }
};

// Create a new shift
export const createWorkTime = async (shiftData) => {
  try {
    const response = await axios.post(`${BASE_URL}/work_time/create_work_time.php`, shiftData);
    console.log("📤 Sending payload:", shiftData);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating work time:", error);
    return { success: false, error };
  }
};

// Update shift
export const updateWorkTime = async (id, shiftData) => {
  try {
    const payload = { id, ...shiftData };
    const response = await axios.put(`${BASE_URL}/work_time/update_work_time.php`, payload);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating work time:", error);
    return { success: false, error };
  }
};

// Delete shift
export const deleteWorkTime = async (id) => {
  try {
    const response = await axios.post(`${BASE_URL}/work_time/delete_work_time.php`, { id });
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting work time:", error);
    return { success: false, error };
  }
};
