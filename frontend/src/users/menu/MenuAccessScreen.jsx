//MenuAccessScreen.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import MenuAccessModal from "./MenuAccessModal";
import BASE_URL from "../../../backend/server/config";
export default function MenuAccessScreen() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // 🔹 Fetch all users
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/users/menu/getAllUsers.php`);
      console.log("Raw users response:", res.data); // 👀 check this in browser console
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching menu access:", err);
    }
  };
  fetchUsers();
}, []);


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Menu Access Management</h1>

      <table className="min-w-full border rounded-lg overflow-hidden shadow">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="border p-3">Username</th>
            <th className="border p-3">Role</th>
            <th className="border p-3">Status</th>
            <th className="border p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user) => (
              <tr key={user.user_id} className="hover:bg-gray-50">
                <td className="border p-3">{user.username}</td>
                <td className="border p-3">{user.role}</td>
                <td className="border p-3">{user.status}</td>
                <td className="border p-3 text-center">
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => setSelectedUser(user)}
                  >
                    Edit Access
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="p-4 text-center text-gray-500">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedUser && (
        <MenuAccessModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
