//C:\xampp\htdocs\central_juan\src\users\hooks\useUserAccess.jsx
import { useState } from "react";
import BASE_URL from "../../../backend/server/config";
export default function useUserAccess() {
  const [loading, setLoading] = useState(false);

  // 🔹 Fetch access for a specific username
  const getUserAccess = async (username) => {
    try {
      const res = await fetch(
        `${BASE_URL}/users/get_user_access.php?username=${encodeURIComponent(username)}`
      );
      const data = await res.json();
      return data; // { success: true, data: {...} }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };
 
  // 🔹 Save / update access
  const saveUserAccess = async (payload) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/users/update_user_access.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { getUserAccess, saveUserAccess, loading };
}
