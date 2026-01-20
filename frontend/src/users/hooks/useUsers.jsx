import { useState, useEffect, useCallback } from "react";
import BASE_URL from "../../../backend/server/config";
export default function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/users/users.php`);
      const data = await res.json();

      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.message || "Failed to fetch users");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update user role & status
  const updateUser = async (user_id, role, status) => {
    try {
      const res = await fetch(`${BASE_URL}/users/update_users.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, role, status }),
      });

      const data = await res.json();

      if (data.success) {
        // Refresh list after update
        await fetchUsers();
        return { success: true };
      } else {
        return { success: false, message: data.message || "Update failed" };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return { users, loading, error, updateUser, refetch: fetchUsers };


 const saveUserAccess = async (userData) => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost/central_juan/backend/users/update_user_access.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch access for single user
  const getUserAccess = async (username) => {
    try {
      const res = await fetch(
        `http://localhost/central_juan/backend/users/get_user_access.php?username=${encodeURIComponent(username)}`
      );
      return await res.json();
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return { saveUserAccess, getUserAccess, loading };

}
