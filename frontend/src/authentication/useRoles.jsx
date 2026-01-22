// src/hooks/useRoles.js
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../backend/server/config";

const useAuthRoles = () => {
  // 1. Initialize as an empty array to prevent map errors immediately
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRoles = async () => {
      try {
        const response = await axios.get(
          `${BASE_URL}/user_role_lists/get_roles.php`,
        );
        if (isMounted) {
          // 2. SAFETY CHECK: Ensure response.data is actually an array
          if (Array.isArray(response.data)) {
            setRoles(response.data);
          } else if (response.data && Array.isArray(response.data.data)) {
            // Handle cases where API returns { success: true, data: [...] }
            setRoles(response.data.data);
          } else {
            console.warn(
              "API did not return an array for roles:",
              response.data,
            );
            setRoles([]); // Fallback to empty array
          }
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Role fetch error:", err);
          setError("Failed to fetch roles");
          setRoles([]); // Fallback on error
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRoles();

    return () => {
      isMounted = false;
    };
  }, []);

  return { roles, loading, error };
};

export default useAuthRoles;
