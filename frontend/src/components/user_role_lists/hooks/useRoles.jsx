//src\components\user_role_lists\hooks\useRoles.jsx
import { useState, useEffect } from "react";
import BASE_URL from "../../../../backend/server/config";

export default function useRolesUsers() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/user_role_lists/get_roles.php`);
      const data = await res.json();
      setRoles(data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (role_name) => {
    await fetch(`${BASE_URL}/user_role_lists/add_role.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_name }),
    });
    await loadRoles();
  };

  const updateRole = async (role_id, role_name) => {
    await fetch(`${BASE_URL}/user_role_lists/update_role.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id, role_name }),
    });
    await loadRoles();
  };

  const deleteRole = async (role_id) => {
    await fetch(`${BASE_URL}/user_role_lists/delete_role.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id }),
    });
    await loadRoles();
  };

  useEffect(() => {
    loadRoles();
  }, []);

  return { roles, loading, addRole, updateRole, deleteRole };
}
