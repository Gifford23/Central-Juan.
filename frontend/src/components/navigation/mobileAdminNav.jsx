import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLogout } from "./Logoutt";
import { useSession } from "../../context/SessionContext";
import RequestIconWithBadge from "../../components/requests/requestNotificationBudge/requestNotificationBudge";
import BASE_URL from "../../../backend/server/config";
import {
  Home,
  UsersRound,
  Calendar,
  DollarSign,
  Fingerprint,
  MailCheck,
  HandCoins,
  AlarmClockCheck,
  LogOut,
  Menu as MenuIcon,
  X,
  RotateCcw,
  Smartphone,
  Settings,
  Logs,
  FileText,
  Bell
} from "lucide-react";

const MobileAdminNav = () => {
  const navigate = useNavigate();
  const { showLogoutAlert } = useLogout();
  const { user } = useSession();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [bottomNavItems, setBottomNavItems] = useState([]);
  const [sideMenuItems, setSideMenuItems] = useState([]);
  const [priorityItems, setPriorityItems] = useState([]); // Time In/Out moved here

  // Build employeeData from session user
  const buildEmployeeDataFromUser = () => {
    if (!user) return null;
    const employee_id =
      user?.employee_id ?? user?.employeeId ?? user?.id ?? user?.username ?? null;
    const fullName =
      user?.fullName ??
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ??
      user?.name ??
      "";
    return {
      employee_id,
      id: employee_id,
      username: user?.username ?? user?.userName ?? null,
      name: fullName,
      fullName,
      position: user?.position_name ?? null,
      email: user?.email ?? null,
    };
  };

  // Fetch menu access dynamically
  useEffect(() => {
    const fetchMenuAccess = async () => {
      try {
        if (!user?.username) return;

        const response = await axios.get(
          `${BASE_URL}/users/menu/getMenuAccess.php`,
          { params: { username: user.username } }
        );

        const data = response.data;
        if (data.error) {
          console.error("Menu fetch error:", data.error);
          return;
        }

        const bottomItems = [];
        const sideItems = [];
        const priority = [];

        // bottom items
        if (data.dashboard === "yes") {
          bottomItems.push({
            icon: Home,
            label: "Dashboard",
            path: "/dashboard",
          });
        }

        // My DTR
        if (data.dtr === "yes") {
          bottomItems.push({
            icon: FileText,
            label: "My DTR",
            path: "/DTRForEmployee",
            passEmployee: true,
          });
        if (data.requests === "yes") {
          sideItems.push({
            icon: AlarmClockCheck,
            label: "Requests",
            path: "/requests",
            customIcon: RequestIconWithBadge,
          });
        }
          // add notifications (keep in side)
          sideItems.push({
            icon: Bell,
            label: "Notifications",
            path: "/notification-list",
            passEmployee: true,
          });
        }

        if (data.employees === "yes") {
          bottomItems.push({
            icon: UsersRound,
            label: "Employees",
            path: "/employeedashboard",
          });
        }
        if (data.attendance === "yes") {
          bottomItems.push({
            icon: Calendar,
            label: "Attendance",
            path: "/attendancedashboard",
          });
        }



        if (data.payroll === "yes") {
          sideItems.push({
            icon: DollarSign,
            label: "Payroll",
            path: "/payrolldashboard",
          });
        }
        if (data.biometrics === "yes") {
          sideItems.push({
            icon: Fingerprint,
            label: "Biometrics",
            path: "/biometrics",
          });
        }
        if (data.email_customization === "yes") {
          sideItems.push({
            icon: MailCheck,
            label: "Email Customization",
            path: "/EmailCustomization",
          });
        }
        if (data.contributions === "yes") {
          sideItems.push({
            icon: HandCoins,
            label: "Contributions",
            path: "/contributions",
          });
        }

        // TIME IN/OUT -> PRIORITY (put on top)
        if (data.time_in_out === "yes") {
          priority.push({
            icon: Smartphone,
            label: "Time In / Out",
            path: "/employee/dashboard",
            passEmployee: true,
          });
        }

        if (data.users_management === "yes") {
          sideItems.push({
            icon: UsersRound,
            label: "Users Management",
            path: "/usersDashboard",
          });
        }
                // side / drawer items (but treat time_in_out as priority)
        if (data.utilities === "yes") {
          sideItems.push({
            icon: Settings,
            label: "Settings",
            path: "/utilitiesdashboard",
          });
        }
        if (data.logs === "yes") {
          sideItems.push({
            icon: Logs,
            label: "System Logs",
            path: "/logs",
          });
        }
        if (data.reset_password === "yes") {
          sideItems.push({
            icon: RotateCcw,
            label: "Reset Password",
            path: "/employee/reset-password",
          });
        }
        setBottomNavItems(bottomItems);
        setSideMenuItems(sideItems);
        setPriorityItems(priority);
      } catch (error) {
        console.error("Error fetching menu access:", error);
      }
    };

    fetchMenuAccess();
  }, [user?.username]);

  // Detect keyboard open/close
  useEffect(() => {
    const handleResize = () => {
      if (window.innerHeight < window.outerHeight - 150) {
        setIsKeyboardOpen(true);
      } else {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isKeyboardOpen) return null;

  const bottomItem = { icon: LogOut, label: "Logout", action: showLogoutAlert };

  const handleNavigate = (item) => {
    if (item.passEmployee) {
      const employeeData = buildEmployeeDataFromUser();
      navigate(item.path, {
        state: {
          employeeData,
        },
      });
    } else {
      navigate(item.path);
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Bottom Nav Bar */}
      {!isMenuOpen && (
        <div className="fixed left-0 right-0 bottom-0 z-50">
          <div className="flex justify-around w-full max-w-[500px] mx-auto bg-white shadow-lg px-2 py-3 border-t rounded-t-3xl">
            {bottomNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = window.location.pathname === item.path;

              return (
                <button
                  key={index}
                  onClick={() => handleNavigate(item)}
                  className={`flex flex-col items-center justify-center text-xs ${
                    isActive ? "text-violet-600" : "text-gray-400"
                  }`}
                  title={item.label}
                >
                  <Icon size={20} />
                  <span className="mt-1">{item.label}</span>
                </button>
              );
            })}

            {/* Menu Trigger */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col items-center justify-center text-xs text-gray-600"
              title="More"
            >
              <MenuIcon size={20} />
              <span className="mt-1">More</span>
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm bg-black/10"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Right Drawer Menu - flex column so footer can be sticky */}
      <div
        className={`fixed top-0 right-0 h-full w-3/4 max-w-[320px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <div>
              <span className="text-lg font-semibold">Menu</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-md hover:bg-gray-100">
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* PRIORITY / TIME IN-OUT (top) */}
            {priorityItems.length > 0 && (
              <div>
                {priorityItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNavigate(item)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-violet-50 border border-violet-100 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-md bg-white border border-violet-100">
                        <Icon size={18} className="text-violet-700" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-violet-700">{item.label}</div>
                        <div className="text-xs text-gray-500">Quickly time in/out</div>
                      </div>
                    </button>
                  );
                })}
                <div className="h-0.5 my-2 bg-gray-100 rounded" />
              </div>
            )}

            {/* Side Menu Items - full-width rows */}
            <nav className="flex flex-col gap-2">
              {sideMenuItems.map((item, index) => {
                const Icon = item.icon;
                const CustomIcon = item.customIcon;
                const isActive = window.location.pathname === item.path;
                return (
                  <button
                    key={index}
                    onClick={() => handleNavigate(item)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition ${
                      isActive ? "bg-violet-50 border border-violet-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-md bg-white border border-gray-100">
                      {CustomIcon ? <CustomIcon size={18} /> : <Icon size={18} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="h-0.5 bg-gray-100 rounded" />
          </div>

          {/* Sticky Footer - prominent Logout (always visible) */}
          <div className="sticky bottom-0 bg-white border-t z-30">
            <div className="max-w-full mx-auto">
              <button
                onClick={() => {
                  bottomItem.action();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all border border-gray-100 "
                style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
              >
                <div className="w-11 h-11 flex items-center justify-center rounded-md bg-red-50 border border-red-100 ">
                  <LogOut size={20} className="text-red-600 " />
                </div>
                <div className="flex-1 text-left pb-2">
                  <div className="text-sm font-semibold text-red-600">Logout</div>
                  <div className="text-xs text-gray-400">Sign out of your account</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileAdminNav;
