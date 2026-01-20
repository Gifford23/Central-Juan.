import { useState } from 'react';
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';

const useOTTypeHooks = () => {
  const [multipliers, setMultipliers] = useState([]);

  const fetchMultipliers = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/overtime_type/get_overtime_type.php?cb=${Date.now()}`);
    setMultipliers(res.data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
};


  const addMultiplier = async (data) => {
    await axios.post(`${BASE_URL}/overtime_type/add_overtime_type.php`, data);
    fetchMultipliers();
  };

  const updateMultiplier = async (data) => {
    await axios.put(`${BASE_URL}/overtime_type/update_overtime_type.php`, data);
    fetchMultipliers();
  };

  const deleteMultiplier = async (id) => {
    await axios.put(`${BASE_URL}/overtime_type/delete_overtime_type.php`, { id });
    fetchMultipliers();
  };

  const toggleMultiplier = async (id, is_enabled) => {
  console.log("Toggling multiplier ID:", id, "→", is_enabled);

  try {
    const res = await axios.put(`${BASE_URL}/overtime_type/OT_type_toggle_multiplier.php`, {
      id,
      is_enabled,
    });
    console.log("Response from toggle API:", res.data);
    fetchMultipliers();
  } catch (err) {
    console.error("Toggle error:", err);
  }
};


  return {
    multipliers,
    fetchMultipliers,
    addMultiplier,
    updateMultiplier,
    deleteMultiplier,
    toggleMultiplier,
  };
};

export default useOTTypeHooks;
