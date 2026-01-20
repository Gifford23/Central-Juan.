// BreakTimeAPI.js
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

// Fetch breaks
export const fetchBreakTimes = async (params = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/break_time/read-break-time.php`, { params });
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching breaks:", error);
    return { success: false, data: [], error: error.message || error };
  }
};

// Create new break
export const createBreakTime = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/break_time/create-break-time.php`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating break:", error);
    return { success: false, error: error.message || error };
  }
};

// Update break
export const updateBreakTime = async (id, data) => {
  try {
    // Some PHP backends expect POST with id in body; adjust server if necessary.
    const response = await axios.put(`${BASE_URL}/break_time/update-break-time.php?id=${id}`, data);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating break:", error);
    return { success: false, error: error.message || error };
  }
};

// Delete break
export const deleteBreakTime = async (id) => {
  try {
    const response = await axios.delete(`${BASE_URL}/break_time/delete-break-time.php?id=${id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting break:", error);
    return { success: false, error: error.message || error };
  }
};
