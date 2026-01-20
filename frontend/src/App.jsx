import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSession, SessionProvider } from './context/SessionContext';
import Login from './authentication/login';
import ProtectedRoute from './authentication/ProtectedRoute';
import Layout from './components/navigation/Layou';
import RoleBasedRedirect from './authentication/RoleBaseRedirect';
import Unauthorized from "./screens/Unauthorized";

import useRoles from './authentication/useRoles';
import Dashboard from './components/dashboard/dashboard';
import Employees from './components/employees/employees';
import Department from './components/departments/department';
import Positions from './components/departments/positions/positions';
import Attendance from './components/attendance/attendance';
import Payroll from './components/payroll/payroll';
// import SalaryGrades from './components/salaryGrade/salaryGrades';
import SalaryForEmployee from './components/salary_for_employee/salary_for_employee';
import Deduction from './components/deductions/deduction';
import PagibigContribution from './components/contributions/pagibig/PagibigContribution';
import PhilhealthContribution from './components/contributions/Philhealth/PhilhealthContribution';
// import SSSContribution from "./components/contributions/sss/sssContribution_temp";
// import SSSContributionTable from './components/contributions/sss/table/SSSContributionTable';
import Employee201 from './components/employee_201/employee201';
import PagibigContributionTable from './components/contributions/pagibig/table/PagibigContributionTable';
import PhilhealthContributionTable from './components/contributions/Philhealth/table/PhilhealthContributionTable';
import BaseSalary from './components/baseSalary/BaseSalary';
import PayrollLog from './components/payroll/payrollLog';
import WeeklyReport from './components/weeklyReport';
import Test from './components/test';
import AttendanceSummary from './components/attendance/attendanceSummary';
import EmployeeDashboard from './components/employees/EmployeeDashboard';
import AttendanceDashoard from './components/attendance/AttendanceDashboard';
import PayrollDashoard from './components/payroll/PayrollDashboard';
import Overtime from './components/requests/overtimeSettings/overtime';
import HolidaysList from './components/holiday/holidays';
import HolidayPage from './components/holiday/Holiday_page';
import OvertimeRequest from './components/requests/overtime/overtimeRequest';
import NotificationRequestPage from './components/admin_Late_request';
import Requests from './components/requests/requests';
import Utitlities from './components/utilities/utilities';
import HolidayIndex from './components/holiday_listt';
import Contributions from './components/contributions/contributions';
import AttendanceMAdmin from './components/attendance/AttendanceMAdmin';
import AtttendanceLogs from './components/attendance/AttendanceLogsAdminM/index';
import EmployeeGridView from './components/employees/employeeTableMode/employeeGridView';
import EmployeeGridViewPage from './components/employees/employeeTableMode/EmployeeGridViewPage.';
import DTREmployeeLIst from './components/DTRattenance/DTRComponent/DTR_Employee_list';
import Att_dashboard_v3 from './components/attendance/attendance_DashboardDesign/att_dashboard_v3';
import LoanPage from './components/loan/LoanPage';
import PayrollPage from './payrollPage/payrollpage/PayrollPage';
import LeaveBalancePage from './components/leave_balance/leave_balancePAGE/Leave_balancePage';
import LeaveTypeTable from './components/leave/leaveComponents/LeaveTypeTable';
import LeaveTypePage from './components/leave/leavePage/LeavetypePage';
import ApproveLeaveTable from './components/leave_employee/leave_approve_components/ApproveLeaveTable';
import ApproveLeavePage from './components/leave_employee/leave_approvePage/ApprovedLeavePage';
import Biometrics from './components/biometrics/biometrics';
import EmailCustomization from './components/email_customization/EmailCustomization';
import Users from './users/Users';
import MenuAccessScreen from './users/menu/MenuAccessScreen';
import ShiftSchedulePage from './components/schedule-manager/schedule-manager-components/ShiftSchedulePage';
import WorkTimeSettings from './components/schedule-manager/schedule-manager-components/WorkTimeSettings';
import Logs from './components/logss/logs';
import Branches from './components/branches/branches';
import AllEmployeesUsersList from './components/biometrics/AllEmployeesUsersList';
import ThirteenthDashboard from './payrollPage/thirteenthComponents/ThirteenthDashboard';
import CommissionManager from './components/commission/CommissionManager';
import CommissionPerEmployee from './payrollPage/commission_page/CommissionPerEmployee';
// Employee Views
import EmployeeMobileDashboard from './mobile/employeeMobileDashboard';
import EmployeeDTR from './mobile/dtr/employeeDTR';
import TimeInOutOld from './mobile/employee/Time_IN_OUT/time_in_outOld';
import OvertimeRequestPage from './mobile/employee/requestOvertime';
import LateRequestFormPage from './mobile/LateRequestform/index';
import TimeInOutPage from './mobile/employee/Time_IN_OUT/index';
import NotificationList from './mobile/NotificationEmployee/NotifiicationList';
import LeaveRequestForm from './mobile/LeaveRequest/LeaveRequestComponents/LeaveRequestForm';
import TestMobile from './mobile/testmobile/TestMobile';
import RoleManager from './components/user_role_lists/RoleManager';
import TableAmPm from './components/DTRattenance/DTRComponent/displayDTR';
import DTRforEmployee from './mobile/dtr/emp_displayDTR';
import ApprovalsQueue from './components/approvals/ApprovalsQueue';
import RoleApproverAssign from './components/approvals/RoleApproverAssign';
import AttendanceSummaryPrint from './payrollPage/payrollComponents/AttendanceSummaryPrint';
// Tests
import UsersManagement from './users/users_dashboard/usersDashboard';
import TestEmailForm from './testScreens/testEmail';
import ResetPassword from './testScreens/ResetPassword';

import '../Styles/globals.css';
import "../Styles/globalcolor.css";

function App() {
  return (
    <SessionProvider>
      <SessionGate />
    </SessionProvider>
  );
}

/**
 * ✅ SessionGate ensures:
 * - Waits for session & roles before rendering routes
 * - Normalizes role names
 * - Handles refresh safely
 */
function SessionGate() {
  const { isLoading } = useSession();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { roles, loading: rolesLoading } = useRoles();

  // Track screen size for responsive layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Block until both session + roles are loaded
  if (isLoading || rolesLoading) {
    return <div>Loading app...</div>;
  }

  // Normalize role names (safe uppercase)
  const normalizedRoles = roles.map(r => r.role_name?.toUpperCase() ?? "");

  const employeeRoles = normalizedRoles.filter(r => r === "EMPLOYEE");
  const adminRoles = normalizedRoles.filter(r => r !== "EMPLOYEE");

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleBasedRedirect />} />

        {/* Admin Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={adminRoles}>
              <Layout isMobile={isMobile} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employeedashboard" element={<EmployeeDashboard />} />
          <Route path="department" element={<Department />} />
          <Route path="positions" element={<Positions />} />
          <Route path="employee201" element={<Employee201 />} />
          <Route path="employees" element={<Employees />} />
          <Route path="employeeGridView" element={<EmployeeGridView />} />
          <Route path="EmployeeGridViewPage" element={<EmployeeGridViewPage />} />
          <Route path="attendancedashboard" element={<AttendanceDashoard />} />
          <Route path="usersDashboard" element={<UsersManagement />} />
          <Route path="adminTest" element={<Test />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="attendanceSummary" element={<AttendanceSummary />} />
          <Route path="AttendanceMAdmin" element={<AttendanceMAdmin />} />
          <Route path="AttendanceLogsM" element={<AtttendanceLogs />} />
          <Route path="payrolldashboard" element={<PayrollDashoard />} />
          <Route path="payroll-page" element={<PayrollPage />} />
          <Route path="baseSalary" element={<BaseSalary />} />
          {/* <Route path="salaryGrades" element={<SalaryGrades />} /> */}
          <Route path="salary_for_employee" element={<SalaryForEmployee />} />
          <Route path="deduction" element={<Deduction />} />
          <Route path="holidays" element={<HolidayPage />} />
          <Route path="payrollLog" element={<PayrollLog />} />
          <Route path="holiday-list" element={<HolidayIndex />} />
          <Route path="contributions" element={<Contributions />} />
          <Route path="PagibigContributionTable" element={<PagibigContributionTable />} />
          <Route path="pagibigContribution" element={<PagibigContribution />} />
          <Route path="PhilhealthContributionTable" element={<PhilhealthContributionTable />} />
          <Route path="PhilhealthContribution" element={<PhilhealthContribution />} />
          {/* <Route path="SSSContributionTable" element={<SSSContributionTable />} />
          <Route path="SSSContribution" element={<SSSContribution />} /> */}
          <Route path="requests" element={<Requests />} />
          <Route path="overtime" element={<Overtime />} />
          <Route path="overtimeRequest" element={<OvertimeRequest />} />
          <Route path="late-attendance-request" element={<NotificationRequestPage />} />
          <Route path="utilitiesdashboard" element={<Utitlities />} />
          <Route path="attendanceRecord" element={<DTREmployeeLIst />} />
          <Route path="att-dashboard" element={<Att_dashboard_v3 />} />
          <Route path="LoanPage" element={<LoanPage />} />
          <Route path="LeaveBalancePage" element={<LeaveBalancePage />} />
          <Route path="LeaveTypePage" element={<LeaveTypePage />} />
          <Route path="ApproveLeavePage" element={<ApproveLeavePage />} />
          <Route path="biometrics" element={<Biometrics />} />
          <Route path="EmailCustomization" element={<EmailCustomization />} />
          <Route path="users" element={<Users />} />
          <Route path="menu-access" element={<MenuAccessScreen />} />
          <Route path="Time-In-Out" element={<TimeInOutPage />} />
          <Route path="role-manager" element={<RoleManager />} />
          <Route path="ShiftSchedulePage" element={<ShiftSchedulePage/>}/>
          <Route path="WorkTimeSettings" element={<WorkTimeSettings/>} />
          <Route path="testEmail" element={<TestEmailForm />} />
          <Route path="logs" element={<Logs />} />
          <Route path="branches" element={<Branches />} />
          <Route path="approval" element={<ApprovalsQueue />} />
          <Route path="approval-assign" element={<RoleApproverAssign />} />
          <Route path='DTRForEmployee' element={<DTRforEmployee/>} />
          <Route path="notification-list" element={<NotificationList />} />
          <Route path="Attendance-summary" element={<AttendanceSummaryPrint />} />
          <Route path="UsersBiometrics" element={<AllEmployeesUsersList />} />
          <Route path="ThirteenthDashboard" element={<ThirteenthDashboard />} />
          <Route path="commission" element={<CommissionManager />} />
          <Route path="commission-per-employee" element={<CommissionPerEmployee />} />


        </Route>

        {/* Employee Routes */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRoles={[...employeeRoles, ...adminRoles]}>
              <Layout isMobile={isMobile} />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<EmployeeMobileDashboard />} />
          <Route path="employeeDTR" element={<EmployeeDTR />} />
          <Route path="time_in_out" element={<TimeInOutOld />} />
          <Route path="requestOvertime" element={<OvertimeRequestPage />} />
          <Route path="notification-list" element={<NotificationList />} />
          <Route path="late-request" element={<LateRequestFormPage />} />
          <Route path="Time-In-Out" element={<TimeInOutPage />} />
          <Route path="Leave-Request-Form" element={<LeaveRequestForm />} />
          <Route path='DTRForEmployee' element={<DTRforEmployee/>} />
          <Route path="TestMobile" element={<TestMobile />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* Unauthorized */}
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Routes>
    </Router>
  );
}

export default App;



// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { useEffect, useState } from 'react';
// import { useSession } from './context/SessionContext';
// import { SessionProvider } from './context/SessionContext';
// import Login from './authentication/login';
// import ProtectedRoute from './authentication/ProtectedRoute';
// import Layout from './components/navigation/Layou';
// import RoleBasedRedirect from './authentication/RoleBaseRedirect';

// // Admin Components
// import Dashboard from './components/dashboard/dashboard';
// import Employees from './components/employees/employees';
// import Department from './components/departments/department';
// import Positions from './components/departments/positions/positions';
// import Attendance from './components/attendance/attendance';
// import Payroll from './components/payroll/payroll';
// import SalaryGrades from './components/salaryGrade/salaryGrades';
// import SalaryForEmployee from './components/salary_for_employee/salary_for_employee';
// import Deduction from './components/deductions/deduction';
// import PagibigContribution from './components/contributions/pagibig/PagibigContribution';
// import PhilhealthContribution from './components/contributions/Philhealth/PhilhealthContribution';
// import SSSContribution from './components/contributions/sss/SSSContribution';
// import SSSContributionTable from './components/contributions/sss/table/SSSContributionTable';
// import Employee201 from './components/employee_201/employee201';
// import PagibigContributionTable from './components/contributions/pagibig/table/PagibigContributionTable';
// import PhilhealthContributionTable from './components/contributions/Philhealth/table/PhilhealthContributionTable';
// import BaseSalary from './components/baseSalary/BaseSalary';
// import PayrollLog from './components/payroll/payrollLog';
// import WeeklyReport from './components/weeklyReport';
// import Test from './components/test';
// import AttendanceSummary from './components/attendance/attendanceSummary';
// import EmployeeDashboard from './components/employees/EmployeeDashboard';
// import AttendanceDashoard from './components/attendance/AttendanceDashboard';
// import PayrollDashoard from './components/payroll/PayrollDashboard';
// import Overtime from './components/requests/overtimeSettings/overtime';
// import HolidaysList from './components/holiday/holidays';
// import OvertimeRequest from './components/requests/overtime/overtimeRequest';
// import NotificationRequestPage from './components/admin_Late_request';
// import Requests from './components/requests/requests';
// import Utitlities from './components/utilities/utilities';
// import HolidayIndex from './components/holiday_listt';
// import Contributions from './components/contributions/contributions';
// import AttendanceMAdmin from './components/attendance/AttendanceMAdmin';
// import AtttendanceLogs from './components/attendance/AttendanceLogsAdminM/index';
// import EmployeeGridView from './components/employees/employeeTableMode/employeeGridView';
// import EmployeeGridViewPage from './components/employees/employeeTableMode/EmployeeGridViewPage.';

// // Employee Components
// import EmployeeMobileDashboard from './mobile/employeeMobileDashboard';
// import EmployeeDTR from './mobile/dtr/employeeDTR';
// import TimeInOutOld from './mobile/employee/Time_IN_OUT/time_in_outOld';
// import OvertimeRequestPage from './mobile/employee/requestOvertime';
// import LateRequestFormPage from './mobile/LateRequestform/index';
// import TimeInOutPage from './mobile/employee/Time_IN_OUT/index';
// import TestMobile from './mobile/testmobile/TestMobile';

// import '../Styles/globals.css';
// import "../Styles/globalcolor.css";


// function App() {
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
//   const { isLoading } = useSession();

//   useEffect(() => {
//     const handleResize = () => setIsMobile(window.innerWidth < 768);
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   if (isLoading) {
//     return <div>Loading app...</div>;
//   }


//   return (
//     <SessionProvider>
//       <Router>
//         <Routes>
//           {/* Login */}
//           <Route path="/login" element={<Login />} />

//           {/* Redirect root */}
//           <Route path="/" element={<RoleBasedRedirect />} />

//           {/* Admin Routes */}
//           <Route path="/"
//             element={
//               <ProtectedRoute allowedRoles={['ADMIN']}>
//                 <Layout isMobile={isMobile} />
//               </ProtectedRoute>
//             }
//           >
//             <Route index element={<Dashboard />} />
//             <Route path="dashboard" element={<Dashboard />} />
//             <Route path="employeedashboard" element={<EmployeeDashboard />} />
//             <Route path="department" element={<Department />} />
//             <Route path="positions" element={<Positions />} />
//             <Route path="employee201" element={<Employee201 />} />
//             <Route path="employees" element={<Employees />} />
//             <Route path="employeeGridView" element={<EmployeeGridView />} />
//             <Route path="EmployeeGridViewPage" element={<EmployeeGridViewPage />} />
//             <Route path="attendancedashboard" element={<AttendanceDashoard />} />
//             <Route path="attendanceDTR" element={<Test />} />
//             <Route path="attendance" element={<Attendance />} />
//             <Route path="attendanceSummary" element={<AttendanceSummary />} />
//             <Route path="AttendanceMAdmin" element={<AttendanceMAdmin />} />
//             <Route path="AttendanceLogsM" element={<AtttendanceLogs />} />
//             <Route path="payrolldashboard" element={<PayrollDashoard />} />
//             <Route path="payroll" element={<Payroll />} />
//             <Route path="baseSalary" element={<BaseSalary />} />
//             <Route path="salaryGrades" element={<SalaryGrades />} />
//             <Route path="salary_for_employee" element={<SalaryForEmployee />} />
//             <Route path="deduction" element={<Deduction />} />
//             <Route path="holidays" element={<HolidaysList />} />
//             <Route path="payrollLog" element={<PayrollLog />} />
//             <Route path="holiday-list" element={<HolidayIndex />} />
//             <Route path="contributions" element={<Contributions />} />
//             <Route path="PagibigContributionTable" element={<PagibigContributionTable />} />
//             <Route path="pagibigContribution" element={<PagibigContribution />} />
//             <Route path="PhilhealthContributionTable" element={<PhilhealthContributionTable />} />
//             <Route path="PhilhealthContribution" element={<PhilhealthContribution />} />
//             <Route path="SSSContributionTable" element={<SSSContributionTable />} />
//             <Route path="SSSContribution" element={<SSSContribution />} />
//             <Route path="requests" element={<Requests />} />
//             <Route path="overtime" element={<Overtime />} />
//             <Route path="overtimeRequest" element={<OvertimeRequest />} />
//             <Route path="late-attendance-request" element={<NotificationRequestPage />} />
//             <Route path="utilitiesdashboard" element={<Utitlities />} />
//           </Route>

//           {/* Employee Routes */}
//           <Route path="/employee"
//             element={
//               <ProtectedRoute allowedRoles={['employee']}>
//                 <Layout isMobile={isMobile} />
//               </ProtectedRoute>
//             }
//           >
//             <Route path="dashboard" element={<EmployeeMobileDashboard />} />
//             <Route path="employeeDTR" element={<EmployeeDTR />} />
//             <Route path="time_in_out" element={<TimeInOutOld />} />
//             <Route path="requestOvertime" element={<OvertimeRequestPage />} />
//             <Route path="late-request" element={<LateRequestFormPage />} />
//             <Route path="Time-In-Out" element={<TimeInOutPage />} />
//             <Route path="TestMobile" element={<TestMobile />} />
//           </Route>

//           {/* Unauthorized */}
//           <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
//         </Routes>
//       </Router>
//     </SessionProvider>
//   );
// }

// export default App;

