// Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LogOut,
  Logs,
  FileText,
  Settings,
  LayoutDashboard,
  Smartphone,
  UserRoundCog,
  FileClock,
  AlarmClockPlus,
  Home,
  Users,
  Calendar,
  Folder,
  DollarSign,
  Calendar1,
  BarChart2,
  UserCheck,
  HandCoins,
  Table2,
  ClipboardMinus,
  TestTube2,
  Braces,
  ChevronDown,
  List,
  UsersRound,
  Component,
  ChevronsLeftRight,
  Lock,
  Unlock,
  Fingerprint,
  MailCheck,
  RotateCcw,
  Bell
} from "lucide-react";
import "../../Styles/sidebar.css";
import Swal from 'sweetalert2';
import DropDownEmp from "../mobile/EmployeeNav";
import axios from 'axios';
import BASE_URL from '../../backend/server/config';
import '../../Styles/globals.css';
import { Tooltip } from "@mui/material";
import { tooltipClasses } from "@mui/material/Tooltip";
import NegroBlanco from '../components/colorMode/negroblanco';
import MobileAdminNav from "./navigation/mobileAdminNav";
import RequestIconWithBadge from "./requests/requestNotificationBudge/requestNotificationBudge";
import { useSession } from "../context/SessionContext";

const Navbar = () => {
  const { user } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showSSS, setShowSSS] = useState(false);
  const [showPhilhealth, setShowPhilhealth] = useState(false);
  const [showPagibig, setShowPagibig] = useState(false);
  const [isContributionsActive, setIsContributionsActive] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState(null);
  const [showEmployeeSubmenu, setshowEmployeeSubmenu] = useState(false);
  const [showAttendanceSubmenu, setshowAttendanceSubmenu] = useState(false);
  const [showPayrollSubmenu, setshowPayrollSubmenu] = useState(false);
  const [showUtilitiesSubmenu, setshowUtilitiesSubmenu] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/systemImage/HorizonHR-logoPC.png');
  const navigate = useNavigate();
  const location = useLocation();
  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDepartmentActive, setIsDepartmentActive] = useState(false);
  const { setUser } = useSession();
  const [menuItems, setMenuItems] = useState([]);

  const confirmLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const showLogoutAlert = () => {
    Swal.fire({
      title: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, log me out!',
      cancelButtonText: 'No, cancel!',
    }).then((result) => {
      if (result.isConfirmed) {
        confirmLogout();
      }
    });
  };

  // Fetch employee data for current user (mobile/getEmployee.php)
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/mobile/getEmployee.php`, {
          params: { employee_id: user?.username },
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data && response.data.employee_id) {
          const { password, ...safeData } = response.data;
          setEmployeeData(safeData);
        } else {
          setErrorMessage('No employee data found');
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setErrorMessage('Error fetching employee data');
      }
    };

    if (user?.username) {
      fetchEmployeeData();
    }
  }, [user?.username]);

  // Helper: build normalized employee payload from employeeData or session user
  const buildEmployeeDataPayload = () => {
    const src = employeeData ?? user ?? {};
    const employee_id = src?.employee_id ?? src?.employeeId ?? src?.id ?? src?.username ?? null;
    const name = src?.first_name ? `${src.first_name} ${src.middle_name ?? ''} ${src.last_name ?? ''}`.trim()
                : src?.fullName ?? src?.name ?? '';
    return {
      employee_id,
      id: employee_id,
      username: src?.username ?? src?.userName ?? null,
      name,
      fullName: name,
      position_name: src?.position_name ?? src?.position ?? null,
      email: src?.email ?? null,
    };
  };

  // Unified navigate handler: attaches employeeData in state when item.passEmployee
  const handleNavigate = (item) => {
    if (!item) return;
    if (item.passEmployee) {
      const payload = buildEmployeeDataPayload();
      console.log('[Navbar] navigate with employee payload ->', item.path, payload);
      navigate(item.path, { state: { employeeData: payload } });
    } else {
      console.log('[Navbar] navigate ->', item.path);
      navigate(item.path);
    }
  };

  const handleGoToAttendance = () => {
    if (!employeeData) return;

    const dataToSend = {
      employee_id: employeeData.employee_id,
      employee_name: `${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`.trim(),
    };

    console.log("Navigating to attendance with user:", dataToSend);
    navigate('/employee/employeeDTR', { state: { user: dataToSend } });
  };

  const handleGoToTimeInOut = () => {
    if (!employeeData) return;

    const employeeName = `${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`.trim();
    const employeeId = employeeData.employee_id;
    const attendanceId = employeeData.attendance_id;

    console.log("Navigating to Time In/Out with user:", { employeeName, employeeId, attendanceId });
    navigate('/employee/Time-In-Out', { state: { employeeName, employeeId, attendanceId } });
  };

  // If the user role is "employee", render only the employee dashboard link and logout
  if (user?.role === "employee") {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full max-h-full font-sans employee-Mdash-container">
        <div className="w-full h-full max-w-[500px] items-center flex flex-col pt-[30px] ">
          <div className="w-[90vw] flex flex-row justify-end absolute " >
            <DropDownEmp
                onGoToAttendance={handleGoToAttendance}
                onGoToTimeInOut={handleGoToTimeInOut}
            />
          </div>
          <div className="flex items-center justify-center w-full h-full py-[45px]">
            <Outlet context={{ user }} />
          </div>
        </div>
      </div>
    );
  }

  const toggleNavbar = () => {
    setIsOpen(!isOpen);
    setIsContributionsActive(!isContributionsActive);
    setActiveMenuItem(null);
    setshowEmployeeSubmenu(false);
    setshowAttendanceSubmenu(false);
    setshowPayrollSubmenu(false);
    setshowUtilitiesSubmenu(false);
  };

  const toggleSSScontribution = () => {
    setShowSSS(!showSSS);
    setShowPhilhealth(false);
    setShowPagibig(false);
  };

  const togglePhilhealthContribution = () => {
    setShowPhilhealth(!showPhilhealth);
    setShowSSS(false);
    setShowPagibig(false);
  };

  const togglePagibigContribution = () => {
    setShowPagibig(!showPagibig);
    setShowSSS(false);
    setShowPhilhealth(false);
  };

  const handleMenuItemClick = (path) => {
    setActiveMenuItem(path);
    setIsContributionsActive(false);
    setIsOpen(false);
    setShowSSS(false);
    setShowPhilhealth(false);
    setShowPagibig(false);
    setshowEmployeeSubmenu(false);
    setshowAttendanceSubmenu(false);
    setshowPayrollSubmenu(false);
    setshowUtilitiesSubmenu(false);

    const hasSubmenu = menuItems.find(item => item.path === path)?.hasEmployeeSubmenu ||
                       menuItems.find(item => item.path === path)?.hasAttendanceSubmenu ||
                       menuItems.find(item => item.path === path)?.hasPayrollSubmenu ||
                       menuItems.find(item => item.path === path)?.hasUtilitiesSubmenu;

    if (!hasSubmenu) {
        setshowEmployeeSubmenu(false);
        setshowAttendanceSubmenu(false);
        setshowPayrollSubmenu(false);
        setshowUtilitiesSubmenu(false);
    }
  };

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

        const items = [];

        if (data.dashboard === "yes") {
          items.push({ name: "Dashboard", path: "/dashboard",  icon: <Home size={18} strokeWidth={3}/> });
        }
        if (data.employees === "yes") {
          items.push({ name: "Employees", path: "/employeedashboard",  icon: <UsersRound size={18} strokeWidth={3}/> });
        }
        // DTR - attach employee payload when clicked
        if (data.dtr === "yes") {
          items.push({ name: "My DTR", path: "/DTRForEmployee",  icon: <FileText size={18} strokeWidth={3}/>, passEmployee: true });
        }
        // Notification list - attach employee payload as well
        if (data.dtr === "yes") {
          items.push({ name: "Notifications", path: "/notification-list", icon: <Bell size={18} strokeWidth={3}/>, passEmployee: true });
        }
        if (data.attendance === "yes") {
          items.push({ name: "Attendance", path: "/attendancedashboard",  icon: <Calendar size={18} strokeWidth={3}/> });
        }
        if (data.payroll === "yes") {
          items.push({ name: "Payroll", path: "/payrolldashboard",  icon: <DollarSign size={18} strokeWidth={3}/> });
        }
        if (data.utilities === "yes") {
          items.push({ name: "Settings", path: "/utilitiesdashboard",  icon: <Settings size={18} strokeWidth={3}/> });
        }
        if (data.requests === "yes") {
          items.push({ name: "Requests", path: "/requests",  icon: <RequestIconWithBadge /> });
        }
        if (data.time_in_out === "yes") {
          items.push({ name: "Time In/Out", path: "/employee/dashboard",  icon: <Smartphone size={18} strokeWidth={3}/> });
        }
        if (data.biometrics === "yes") {
          items.push({ name: "Biometrics", path: "/biometrics",  icon: <Fingerprint /> });
        }
        if (data.email_customization === "yes") {
          items.push({ name: "Email Customization", path: "/EmailCustomization",  icon: <MailCheck /> });
        }
        if (data.users_management === "yes") {
          items.push({ name: "Users Management", path: "/usersDashboard",  icon: <UserRoundCog  size={18} strokeWidth={3}/>, hasUtilitiesSubmenu: false });
        }
        if (data.contributions === "yes") {
          items.push({ name: "Contributions", path: "/contributions",  icon: <HandCoins size={18} strokeWidth={3}/>, hasUtilitiesSubmenu: false });
        }
        if (data.reset_password === "yes") {
          items.push({ name: "Reset Password", path: "/employee/reset-password",  icon: <RotateCcw size={18} strokeWidth={3}/> , hasEmployeeSubmenu: false});
        }
        if (data.logs === "yes") {
          items.push({ name: "System Logs", path: "/logs",  icon: <Logs  size={18} strokeWidth={3}/> , hasEmployeeSubmenu: false});
        }
        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu access:", error);
      }
    };

    fetchMenuAccess();
  }, [user?.username]);

  const pagibig = 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Pag-IBIG.svg';
  const philhealth = 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Philippine_Health_Insurance_Corporation_%28PhilHealth%29.svg';
  const sss = 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Social_Security_System_%28SSS%29.svg';

  const menuItemsContribution = user?.role === "ADMIN" || user?.role === "hr" ? [
    { name: "Pagibig", icon: <img onClick={togglePagibigContribution} src={pagibig} alt="Pagibig" style={{ height: 35 }} /> },
    { name: "Philhealth", icon: <img onClick={togglePhilhealthContribution} src={philhealth} alt="Philhealth" style={{ width: 38, height: 20 }} /> },
    { name: "SSS", icon: <img onClick={toggleSSScontribution} src={sss} alt="SSS" style={{ height: 25 }} /> },
  ] : [];

  const handleMouseEnter = () => {
    setLogoSrc('/systemImage/HorizonHR-logoPC.png');
  };
  const handleMouseLeave = () => {
    setLogoSrc('/systemImage/HorizonHR-logo.png');
  };

  // --- NEW: group menu items so specific items appear in bottom group (still dynamic) ---
  const bottomNames = ["My DTR", "Notifications", "Time In/Out", "Reset Password"];
  const topMenuItems = menuItems.filter(m => !bottomNames.includes(m.name));
  const bottomMenuItems = menuItems.filter(m => bottomNames.includes(m.name));

  const renderMenuList = (items) => (
    <div className="flex flex-col w-full gap-y-2">
      {items.map((item) => (
        <div key={item.path} >
          <Link
            to={item.path}
            onClick={(e) => {
              // IMPORTANT: prevent default Link navigation and use our navigate() so we can attach state
              e.preventDefault();
              handleMenuItemClick(item.path);
              handleNavigate(item);
            }}
            className={`test-sidebar-item rounded-[10px] Glc-sidebar-textcolor nb-sidebar-textcolor w-full flex flex-1 transition-colors duration-300 ease-in-out
              ${activeMenuItem === item.path ? "Glc-sidebar-selectedhovercolor" : "Glc-sidebar-hovercolor"}
              ${activeMenuItem === item.path ? "Glc-sidebar-textcolor" : "opacity-60 hover:opacity-100"}
            `}
          >
            <div className={`sidebar-container-items`}>
              <div className={`${activeMenuItem === item.path ? "Glc-sidebar-selectediconcolor" : ""}`}> {item.icon} </div>
              <div className="flex flex-row items-center justify-between w-full">
                {isHovered && <div> {item.name} </div>}
                {item.hasEmployeeSubmenu && (
                  <div className={`sidebar-hasSubMenu transition-transform duration-300 ${showEmployeeSubmenu ? "rotate-180" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setshowAttendanceSubmenu(false);
                      setshowPayrollSubmenu(false);
                      setshowUtilitiesSubmenu(false);
                      if (item.hasEmployeeSubmenu) {
                        setshowEmployeeSubmenu(prev => !prev);
                      }
                    }}
                  >
                    <ChevronDown size={16} strokeWidth={4} className={`${activeMenuItem === item.path ? "Glc-sidebar-selectediconcolor" : ""}`}/>
                  </div>
                )}
                {item.hasAttendanceSubmenu && (
                  <div className={`sidebar-hasSubMenu transition-transform duration-300 ${showAttendanceSubmenu ? "rotate-180" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setshowEmployeeSubmenu(false);
                      setshowPayrollSubmenu(false);
                      setshowUtilitiesSubmenu(false);
                      if (item.hasAttendanceSubmenu) { setshowAttendanceSubmenu(prev => !prev); }
                    }}
                  >
                    <ChevronDown size={16} strokeWidth={4} className={`${activeMenuItem === item.path ? "Glc-sidebar-selectediconcolor" : ""}`}/>
                  </div>
                )}
                {item.hasPayrollSubmenu && (
                  <div className={`sidebar-hasSubMenu transition-transform duration-300 ${showPayrollSubmenu ? "rotate-180" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setshowEmployeeSubmenu(false);
                      setshowAttendanceSubmenu(false);
                      setshowUtilitiesSubmenu(false);
                      if (item.hasPayrollSubmenu) { setshowPayrollSubmenu(prev => !prev); }
                    }}
                  >
                    <ChevronDown size={16} strokeWidth={4} className={`${activeMenuItem === item.path ? "Glc-sidebar-selectediconcolor" : ""}`}/>
                  </div>
                )}
                {item.hasUtilitiesSubmenu && (
                  <div className={`sidebar-hasSubMenu transition-transform duration-300 ${showUtilitiesSubmenu ? "rotate-180" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setshowAttendanceSubmenu(false);
                      setshowPayrollSubmenu(false);
                      setshowEmployeeSubmenu(false);
                      if (item.hasUtilitiesSubmenu) { setshowUtilitiesSubmenu(prev => !prev); }
                    }}
                  >
                    <ChevronDown size={16} strokeWidth={4} className={`${activeMenuItem === item.path ? "Glc-sidebar-selectediconcolor]" : ""}`}/>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* ... your submenu renderings unchanged ... */}
        </div>
      ))}
    </div>
  );

  return (
    <>
    <div className={`sidebar Glc-sidebar-maincolor hidden md:flex`}>
      <div
        className={`test-sidebar Glc-test-sidebar Glc-sidebar-textcolor transition-ease-out duration-200 font-semibold nb-sidebar-navcolor nb-sidebar-textcolor
          ${isHovered || isPinned ? "w-65" : "w-16"}`}
        onMouseEnter={() => {
          setIsHovered(true);
          setShowSSS(false);
          setShowPhilhealth(false);
          setShowPagibig(false);
          handleMouseEnter();
        }}
        onMouseLeave={() => {
          if (!isPinned) {
            setIsHovered(false)
            handleMouseLeave();
          }
        }}
      >
        <div className="sidebar-top">
          <img src={logoSrc} alt="Logo"
            className={`${isHovered ? "w-50 h-full" : "w-10 h-15"}`} />
        </div>

        <nav
          className={`sidebar-middle flex flex-col justify-between h-full`}
          onMouseLeave={() => {
            setshowEmployeeSubmenu(false);
            setshowAttendanceSubmenu(false);
            setshowPayrollSubmenu(false);
            setshowUtilitiesSubmenu(false);
          }}
        >
          {/* TOP menu (flows normally) */}
          <div>
            {renderMenuList(topMenuItems)}
          </div>

          {/* BOTTOM menu group: visually separated but still part of flow (not absolute) */}
          <div className="w-full">
            {/* divider / break line specifically for the four items requested */}
            {bottomMenuItems.length > 0 && (
              <div className="w-full h-[2.5px] my-1 rounded-full nb-sidebar-slicercontribution" />
            )}

            {renderMenuList(bottomMenuItems)}
          </div>
        </nav>

        {isHovered &&
        <div className="sidebar-specialbutton-box">
          <Tooltip
            title="Lock Sidebar"
            placement="bottom-end"
            slotProps={{
              popper: {
                sx: {
                  [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
                    {
                      marginTop: '7px',
                      backgroundColor: '#46494c',
                    }
                }
              }
            }}
          >
            <button onClick={() => setIsPinned(prev => !prev)}
              className={`sidebar-pin-button
                ${isPinned ? "sidebar-pin-button-clicked" : ""}`}
            >
              {isPinned ? <Lock size={15} strokeWidth={3} color="#bee9e8" /> : <Unlock size={15} strokeWidth={2} />}
            </button>
          </Tooltip>

          <div className="sidebar-colormode-button">
          </div>
        </div>
        }
        <div className="sidebar-bottom">
          <div className="h-0.5 w-full rounded-full bg-gray-500" />
            <button
              onClick={showLogoutAlert}
              className="sidebar-lgtButton Glc-sidebar-hovercolor flex flex-row w-full h-10 pl-4 gap-x-2 place-items-center rounded-[5px]"
            >
              <div><LogOut size={18} /></div>
              {isHovered && <div className="sidebar-lgt"> Logout </div>}
            </button>
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-lg">
            <h2 className="mb-4 text-xl">Are you sure you want to log out?</h2>
            <div className="flex justify-end space-x-4">
              <button onClick={() => setShowLogoutModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                No
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-500 rounded Glc-sidebar-textcolor"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="duration-200 sidebar-outlet Glc-sidebar-outletcolor transition-ease-out">
        <Outlet context={{ user }} />
      </div>
    </div>

    </>
  );
};

export default Navbar;
