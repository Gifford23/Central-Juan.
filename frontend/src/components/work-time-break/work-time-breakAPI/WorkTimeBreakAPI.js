// src/components/WorkTimeBreakUI/WorkTimeBreakAPI.js
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

export const fetchBreaks = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/break_time/read-break-time.php`);
    return res.data.success ? res.data.data : [];
  } catch (err) {
    console.error("❌ Error fetching breaks:", err);
    return [];
  }
};

// ✅ GET all mappings (or filter by work_time_id)
export const fetchWorkTimeBreaks = async (work_time_id = null) => {
  try {
    const url = work_time_id
      ? `${BASE_URL}/work-time-break/read-work-time-break-mappings.php?work_time_id=${work_time_id}` 
      : `${BASE_URL}/work-time-break/read-work-time-break-mappings.php`;

    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching work time breaks:", error);
    return { success: false, data: [], error };
  }
};

// ✅ POST create a new mapping
export const createWorkTimeBreak = async ({ work_time_id, break_id }) => {
  try {
    console.log("📤 Sending to API:", { work_time_id, break_id }); // ✅ Debug log

    const res = await axios.post(
      `${BASE_URL}/work-time-break/create-work-time-break-mappings.php`,
      {
        work_time_id: parseInt(work_time_id),
        break_id: parseInt(break_id),
      }
    );

    console.log("📥 API response:", res.data); // ✅ Debug log
    return res.data;
  } catch (err) {
    console.error("❌ Error creating mapping:", err);
    return { success: false, message: "Request failed" };
  }
};



// ✅ DELETE a mapping
export const deleteWorkTimeBreak = async (id) => {
  try {
    const response = await axios.delete(
      `${BASE_URL}/work-time-break/delete-work-time-break-mapping.php`,
      { data: { id } }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Error deleting work time break:", error);
    return { success: false, error };
  }
};
