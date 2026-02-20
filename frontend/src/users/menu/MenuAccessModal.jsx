//menu access modal
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../../backend/server/config";
// import RequestIconWithBadge from "../../../../requests/requestNotificationBudge/requestNotificationBudge";
import RequestIconWithBadge from "../../components/requests/requestNotificationBudge/requestNotificationBudge";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Component,
  ClipboardMinus,
  UserRoundCog,
  Fingerprint,
  MailCheck,
  HandCoins,
  Lock,
  List,
  Home,
  UsersRound,
  Smartphone,
} from "lucide-react";

const menuConfig = {
  dashboard: { label: "Dashboard", icon: Home },
  employees: { label: "Employees", icon: UsersRound },
  attendance: { label: "Attendance", icon: Calendar },
  dtr: { label: "DTR", icon: Calendar },

  payroll: { label: "Payroll", icon: DollarSign },
  utilities: { label: "Utilities", icon: Component },
  requests: { label: "Requests", icon: RequestIconWithBadge },
  // users: { label: "User Management", icon: UserRoundCog },
  biometrics: { label: "Biometrics", icon: Fingerprint },
  email_customization: { label: "Email Customization", icon: MailCheck },
  contributions: { label: "Contributions", icon: HandCoins },
  time_in_out: { label: "Time In/Out", icon: Smartphone },
  users_management: { label: "Users Management", icon: Users },
  reset_password: { label: "Reset Password", icon: Lock },
  // menu_access: { label: "Menu Access", icon: LayoutDashboard },
};

export default function MenuAccessModal({ user, onClose }) {
  const [access, setAccess] = useState({});
  const [loading, setLoading] = useState(false);

  const menuOptions = Object.keys(menuConfig);

  // 🔹 Fetch user menu access
  useEffect(() => {
    const fetchAccess = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/users/menu/getMenuAccess.php?username=${user.username}`,
        );
        const fetched = res.data || {};

        // ✅ Normalize all options (default = no)
        const normalized = {};
        menuOptions.forEach((opt) => {
          normalized[opt] = fetched[opt] || "no";
        });

        setAccess({ username: user.username, ...normalized });
      } catch (err) {
        console.error("Error fetching access:", err);
      }
    };
    fetchAccess();
  }, [user.username]);

  const toggleAccess = (field) => {
    setAccess((prev) => ({
      ...prev,
      [field]: prev[field] === "yes" ? "no" : "yes",
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { username: user.username };
      menuOptions.forEach((opt) => {
        payload[opt] = access[opt] === "yes" ? "yes" : "no";
      });

      const res = await axios.post(
        `${BASE_URL}/users/menu/update_menu_access.php`,
        payload,
      );

      if (res.data.success) {
        alert("Access updated successfully!");
        onClose();
      } else {
        alert(res.data.message || "Failed to update access");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/10 bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4">
          Edit Menu Access - {user.username}
        </h2>

        <div className="space-y-3">
          {menuOptions.map((option) => {
            const { label, icon: Icon } = menuConfig[option] || {
              label: option,
              icon: List,
            };
            return (
              <label
                key={option}
                className="flex items-center justify-between border-b pb-2 py-1"
              >
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-gray-600" />
                  <span>{label}</span>
                </div>
                <input
                  type="checkbox"
                  checked={access[option] === "yes"}
                  onChange={() => toggleAccess(option)}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleSave}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
