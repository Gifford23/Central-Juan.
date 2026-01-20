import axios from "axios";
import BASE_URL from "../../../../../backend/server/config";

// Get all tiers
export const getTiers = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/Late-deduction-settings/late-deduction-tier/read-late-deduction-tier.php`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Map tier to shift (Create)
export const mapTierToShift = async (data) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/Late-deduction-settings/late-deduction-mapping/create-late-deduction-mapping.php`,
      data
    );
    console.log('create mapTierShift for deduction', response);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all mappings (Read) - can pass workTimeId to filter
export const getMappings = async (workTimeId = null) => {
  try {
    const url = workTimeId
      ? `${BASE_URL}/Late-deduction-settings/late-deduction-mapping/read-late-deduction-mappings.php?work_time_id=${workTimeId}`
      : `${BASE_URL}/Late-deduction-settings/late-deduction-mapping/read-late-deduction-mappings.php`;

    const response = await axios.get(url);
    console.log("getMapping", response);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Update mapping (Update)
export const updateMapping = async (id, data) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/work_time_late_deduction/update.php?id=${id}`,
      data
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Delete mapping (Delete)
export const deleteMapping = async (id) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/Late-deduction-settings/late-deduction-mapping/delete-late-deduction-mappings.php?id=${id}`
    );
    console.log('remove LD', response)
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
