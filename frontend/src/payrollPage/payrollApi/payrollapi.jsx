// components/payroll/api/payrollAPI.js
import axios from 'axios';
import BASE_URL from '../../../backend/server/config';
import Swal from "sweetalert2";

export const fetchPayrollsAPI = () => {
  return axios.get(`${BASE_URL}/payroll/payroll.php`);
};

export const deletePayrollAPI = (payrollId) => {
  return axios.post(`${BASE_URL}/payroll/delete_payroll.php`, {
    payroll_id: payrollId,
  });
};

// ✅ New API for saving manual loan deduction
export const saveLoanDeductionAPI = ({ employee_id, loan_id, final_loan_deduction }) => {
  return axios.post(`${BASE_URL}/payroll/save_loan_deduction.php`, {
    employee_id,
    loan_id,
    final_loan_deduction,
  });
};

// New API for updating payroll type
export const updateContributionTypeAPI = async ({ payroll_id, payroll_type, contribution_deduction_type }) => {
  try {
    const response = await axios.put(`${BASE_URL}/payroll/update_payroll.php`, {
      payroll_id,
      payroll_type,
      contribution_deduction_type,
    });

    console.log("📦 Raw API response:", response);
    return response.data;
  } catch (error) {
    console.error("❌ API error in updateContributionTypeAPI:", error);
    throw error;
  }
};

export const syncLoanDeductionsToPayroll = async () => {
  try {
    const res = await axios.post(`${BASE_URL}/payroll/update_loan_deduction_applied.php`);
    console.log(res.data.message);
  } catch (err) {
    console.error("Sync failed:", err);
  }
};

export const syncLoanDeductionForPayroll = async ({ employee_id, date_from, date_until }) => {
  try {
    const res = await axios.post(`${BASE_URL}/payroll/sync_loan_deductions.php`, {
      employee_id,
      date_from,
      date_until
    });
    return res.data;
  } catch (error) {
    console.error("Error syncing loan deduction for payroll:", error);
    return { success: false, error };
  }
};

// New API for updating contribution override
export const updateContributionOverrideAPI = async ({
  employee_id,
  type,
  override_amount,
  is_override_enabled
}) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/payroll/update_contribution_override.php`,
      { employee_id, type, override_amount, is_override_enabled },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("updateContributionOverrideAPI response:", response.data);
    return response.data;
  } catch (error) {
    console.error("API error:", error);
    throw error;
  }
};

//no file or abandond
export const fetchEmployeePayrollAPI = async ({ employee_id }) => {
  try {
    const res = await axios.post(`${BASE_URL}/payroll/fetch_employee_payroll.php`, { employee_id }, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (error) {
    console.error("fetchEmployeePayrollAPI error:", error);
    return { success: false, error };
  }
};

// ✅ New API for updating employee type with Swal notifications
export const updateEmployeeTypeAPI = async ({
  employee_id,
  newType,
  oldType,
  employeeName,
  user,
  setPayrollList
}) => {
  // Optimistic UI update
  setPayrollList(prev =>
    prev.map(p =>
      p.employee_id === employee_id ? { ...p, employee_type: newType } : p
    )
  );

  try {
    const response = await axios.put(
      `${BASE_URL}/employeesSide/update_employee.php`,
      {
        employee_id,
        employee_type: newType,
        current_user: user
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const data = response.data;

    if (data.status === "success") {
      Swal.fire({
        icon: "success",
        title: "Employee Updated",
        html: `<b>${employeeName}</b><br/>Type changed: ${oldType} → ${newType}`,
        showConfirmButton: false,
        timer: 2500
      });

      // ✅ Re-fetch payrolls after success to ensure fresh data
      try {
        const res = await fetchPayrollsAPI();
        if (res.data.success) {
          setPayrollList(res.data.data);
        }
      } catch (refreshErr) {
        console.error("Failed to refresh payrolls:", refreshErr);
      }

    } else {
      // Rollback if backend failed
      setPayrollList(prev =>
        prev.map(p =>
          p.employee_id === employee_id ? { ...p, employee_type: oldType } : p
        )
      );

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: data.message || "Something went wrong."
      });
    }
  } catch (err) {
    // Rollback on network error
    setPayrollList(prev =>
      prev.map(p =>
        p.employee_id === employee_id ? { ...p, employee_type: oldType } : p
      )
    );

    Swal.fire({
      icon: "error",
      title: "Network Error",
      text: "Failed to update employee type."
    });

    console.error("Update failed:", err);
  }
};

// Fetch payroll summary for a cutoff (returns { success, data, summary, journal, journal_balanced })
export const fetchPayrollSummaryAPI = ({ date_from, date_until, employee_id = null }) => {
  const url = `${BASE_URL}/payroll/payroll_summary.php`;
  const params = { date_from, date_until };
  if (employee_id) params.employee_id = employee_id;
  return axios.get(url, { params });
};






// // components/payroll/api/payrollAPI.js
// import axios from 'axios';
// import BASE_URL from '../../../backend/server/config';

// export const fetchPayrollsAPI = () => {
//   return axios.get(`${BASE_URL}/payroll/payroll.php`);
// };

// export const deletePayrollAPI = (payrollId) => {
//   return axios.post(`${BASE_URL}/payroll/delete_payroll.php`, {
//     payroll_id: payrollId,
//   });
// };

// // ✅ New API for saving manual loan deduction
// export const saveLoanDeductionAPI = ({ employee_id, loan_id, final_loan_deduction }) => {
//   return axios.post(`${BASE_URL}/payroll/save_loan_deduction.php`, {
//     employee_id,
//     loan_id,
//     final_loan_deduction,
//   });
// };



// export const syncLoanDeductionsToPayroll = async () => {
//   try {
//     const res = await axios.post(`${BASE_URL}/payroll/update_loan_deduction_applied.php`);
//     console.log(res.data.message);
//   } catch (err) {
//     console.error("Sync failed:", err);
//   }
// };


// export const syncLoanDeductionForPayroll = async ({ employee_id, date_from, date_until }) => {
//   try {
//     const res = await axios.post(`${BASE_URL}/payroll/sync_loan_deductions.php`, {
//       employee_id,
//       date_from,
//       date_until
//     });
//     return res.data;
//   } catch (error) {
//     console.error("Error syncing loan deduction for payroll:", error);
//     return { success: false, error };
//   }
// };
