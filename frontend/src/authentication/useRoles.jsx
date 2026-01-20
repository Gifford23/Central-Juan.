// src/hooks/useRoles.js
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../backend/server/config";

const useAuthRoles  = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // ✅ prevents state updates after unmount

    const fetchRoles = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/user_role_lists/get_roles.php`);
        if (isMounted) {
          setRoles(response.data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to fetch roles");
          setRoles([]);
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

export default useAuthRoles ;
