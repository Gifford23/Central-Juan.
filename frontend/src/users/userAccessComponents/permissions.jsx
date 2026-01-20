// permissions.js
export const PERMISSION_GROUPS = {
  "Common Access": {
    can_edit: "Edit",
    can_add: "Add",
    can_delete: "Delete",
    can_print: "Print",
    can_action: "Action",
    can_view: "View",
  },
  "Employee Access": {
    employee_list: "Employee List",
    department: "Department",
    branches:"Branches",
    user_biometrics:"Users Biometrics"
  },
  "Attendance Access": {
    attendance_dtr: "Attendance DTR", 
    attendance_log: "Attendance Log",
    leave_access: "Leave Access",
    schedule_management: "Schedule Manangement"
  },
  "Payroll Access": {
    can_edit_payroll_date: "Generate Payroll",
    can_print_payroll: "Print Payroll",
    can_payroll_logs: "Payroll Logs",
    payroll_records: "Payroll Records",
    loan: "Loan",
  },
  "Utilities Access": {
    // late_deduction: "Late Deduction",
    leave_type: "Leave Type",
    overtime: "Overtime",
    holiday: "Holiday",
    leave_balances: "Leave Balances",
    schedule_settings: "Schedule Settings"

  },
  "Employee Requests Access": {
    attendance_request: "Attendance Requests",
    overtime_request: "Overtime Requests",
    leave_request: "Leave Requests",
  },
    "User Management Access": {
    manage_users_access: "Role-Based Access Control",
    user_role_management: "User Role Management",
    assign_approver:"Assign Approver Level",
    approvals_queue:"Approval Shifts Queue"
  },
};
