// components/thirteenth/api/thirteenthMonthAPI.jsx
import axios from "axios";
import BASE_URL from "../../../backend/server/config";

/**
 * Thirteenth Month API helper
 * - All endpoints assume the PHP files are located under: {BASE_URL}/thirteenth/
 * - Example PHP endpoints expected:
 *    - tm_create_entry.php
 *    - tm_get_entries.php
 *    - tm_get_entry.php
 *    - tm_update_entry.php
 *    - tm_delete_entry.php
 *    - tm_bulk_create_entries.php
 *    - tm_compute.php            (optional - compute & persist payout)
 *    - tm_get_payout.php         (optional - read computed payout)
 *    - tm_slip.php               (optional - return HTML or PDF)
 *    - tm_config.php             (optional - get/set config)
 *    - tm_employee_mode.php      (optional - per-employee mode override)
 *
 * Adjust endpoints if your backend paths differ.
 */

/* -----------------------
   READ / LIST entries
   ----------------------- */
/**
 * Fetch entries for an employee and year.
 * If no employee_id provided, endpoint should return entries for the year (backend dependent).
 *
 * @param {Object} params - { employee_id?: string, calendar_year?: number }
 * @returns {Promise<Object>} axios response data
 */
export const fetchTmEntriesAPI = async (params = {}) => {
  try {
    const res = await axios.get(`${BASE_URL}/thirteenth/tm_get_entries.php`, {
      params,
    });
    return res.data;
  } catch (error) {
    console.error("fetchTmEntriesAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Fetch single entry by entry_id
 * @param {number} entry_id
 */
export const fetchTmEntryAPI = async (entry_id) => {
  try {
    const res = await axios.get(`${BASE_URL}/thirteenth/tm_get_entry.php`, {
      params: { entry_id },
    });
    return res.data;
  } catch (error) {
    console.error("fetchTmEntryAPI error:", error);
    return { success: false, error };
  }
};

/* -----------------------
   CREATE / UPDATE / DELETE
   ----------------------- */
/**
 * Create or upsert a single entry.
 * Body example:
 * {
 *   employee_id: 'CJIS-2025-0001',
 *   calendar_year: 2025,
 *   mode: 'semi_monthly',
 *   period_index: 1,
 *   period_start: '2024-12-28',
 *   period_end: '2025-01-13',
 *   gross_amount: 12345.67,
 *   notes: 'optional',
 *   created_by: 'admin'
 * }
 */
export const createTmEntryAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_create_entry.php`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("createTmEntryAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Update a single entry.
 * The PHP update endpoint expects JSON with entry_id and allowed fields.
 * Example: { entry_id: 123, gross_amount: 2000, notes: 'correction' }
 */
export const updateTmEntryAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_update_entry.php`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("updateTmEntryAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Delete entry by entry_id.
 * Example: { entry_id: 123 }
 */
export const deleteTmEntryAPI = async (entry_id) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_delete_entry.php`,
      { entry_id },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("deleteTmEntryAPI error:", error);
    return { success: false, error };
  }
};

/* -----------------------
   BULK CREATE / UPLOAD
   ----------------------- */
/**
 * Bulk create/upsert entries (transactional on backend).
 * payload: { entries: [ { employee_id, calendar_year, mode, period_index, period_start, period_end, gross_amount, notes, created_by }, ... ] }
 */
export const bulkCreateTmEntriesAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_bulk_create_entries.php`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("bulkCreateTmEntriesAPI error:", error);
    return { success: false, error };
  }
};

/* -----------------------
   COMPUTE / PAYOUTS
   ----------------------- */
/**
 * Trigger compute for a single employee (backend should compute & persist)
 * payload: { employee_id, calendar_year }
 * Note: implement corresponding tm_compute.php on backend.
 */
export const computeTmPayoutAPI = async ({ employee_id, calendar_year }) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_compute.php`,
      { employee_id, calendar_year },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("computeTmPayoutAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Fetch computed payout for an employee and year.
 * params: { employee_id, calendar_year }
 * Note: tm_get_payout.php should return persisted record from thirteenth_month_payouts.
 */
export const fetchTmPayoutAPI = async (params = {}) => {
  try {
    const res = await axios.get(`${BASE_URL}/thirteenth/tm_get_payout.php`, {
      params,
    });
    return res.data;
  } catch (error) {
    console.error("fetchTmPayoutAPI error:", error);
    return { success: false, error };
  }
};

/* -----------------------
   PRINT / SLIP
   ----------------------- */
/**
 * Get slip HTML or PDF for employee/year.
 * - format: 'html' (default) or 'pdf'
 * - if format = 'pdf', set responseType = 'blob' to receive binary
 *
 * Example usage:
 *   const slipHtml = await fetchTmSlipAPI({ employee_id, calendar_year, format: 'html' });
 */
export const fetchTmSlipAPI = async ({ employee_id, calendar_year, format = "html" }) => {
  try {
    const url = `${BASE_URL}/thirteenth/tm_slip.php`;
    if (format === "pdf") {
      const res = await axios.get(url, {
        params: { employee_id, calendar_year, format },
        responseType: "blob",
      });
      return res.data; // caller handles blob -> download
    } else {
      const res = await axios.get(url, { params: { employee_id, calendar_year, format } });
      return res.data; // html string or JSON depending on backend
    }
  } catch (error) {
    console.error("fetchTmSlipAPI error:", error);
    return { success: false, error };
  }
};

/* -----------------------
   CONFIG / EMPLOYEE MODE
   ----------------------- */
/**
 * Fetch global 13th-month config
 * Example response: { default_mode: 'semi_monthly', cutoff_assignment: 'period_end' }
 */
export const fetchTmConfigAPI = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/thirteenth/tm_config.php`);
    return res.data;
  } catch (error) {
    console.error("fetchTmConfigAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Update global config (PATCH-like)
 * payload example: { default_mode: 'monthly', cutoff_assignment: 'period_end', updated_by: 'admin' }
 */
export const updateTmConfigAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_update_config.php`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("updateTmConfigAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Set per-employee mode override
 * payload: { employee_id, mode: 'monthly'|'semi_monthly', effective_from?: 'YYYY-MM-DD', effective_to?: 'YYYY-MM-DD' }
 * Backend file: tm_employee_mode.php (create/update)
 */
export const setEmployeeModeAPI = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_employee_mode.php`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("setEmployeeModeAPI error:", error);
    return { success: false, error };
  }
};

/* -----------------------
   UTILS / BULK HELPERS
   ----------------------- */
/**
 * Example helper: compute all employees for a year (calls tm_compute_bulk.php).
 * payload: { calendar_year: 2025 }
 * Note: create tm_compute_bulk.php in backend to support this.
 */
export const computeAllEmployeesAPI = async ({ calendar_year }) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/thirteenth/tm_compute_bulk.php`,
      { calendar_year },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data;
  } catch (error) {
    console.error("computeAllEmployeesAPI error:", error);
    return { success: false, error };
  }
};

/**
 * Fetch employees (dropdown / list).
 * params: { status: 'active'|'inactive'|'all', q?: string }
 * Example: fetchEmployeesAPI({ status: 'all' })
 */
export const fetchEmployeesAPI = async (params = { status: "active" }) => {
  try {
    const res = await axios.get(`${BASE_URL}/thirteenth/tm_get_employees.php`, {
      params,
    });
    return res.data;
  } catch (error) {
    console.error("fetchEmployeesAPI error:", error);
    return { success: false, error };
  }
};


// fetch deductions for employee/year
export const fetchTmDeductionsAPI = async ({ employee_id, calendar_year }) => {
  try {
    const res = await axios.get(`${BASE_URL}/thirteenth/tm_deduction_get.php`, { params: { employee_id, calendar_year } });
    return res.data;
  } catch (err) { console.error("fetchTmDeductionsAPI", err); return { success:false, error:err }; }
};

export const createTmDeductionAPI = async (payload) => {
  try {
    const res = await axios.post(`${BASE_URL}/thirteenth/tm_deduction_create.php`, payload, { headers: { "Content-Type": "application/json" }});
    return res.data;
  } catch (err) { console.error("createTmDeductionAPI", err); return { success:false, error:err }; }
};

export const updateTmDeductionAPI = async (payload) => {
  try {
    const res = await axios.post(`${BASE_URL}/thirteenth/tm_deduction_update.php`, payload, { headers: { "Content-Type": "application/json" }});
    return res.data;
  } catch (err) { console.error("updateTmDeductionAPI", err); return { success:false, error:err }; }
};

export const deleteTmDeductionAPI = async ({ deduction_id }) => {
  try {
    const res = await axios.post(`${BASE_URL}/thirteenth/tm_deduction_delete.php`, { deduction_id }, { headers: { "Content-Type": "application/json" }});
    return res.data;
  } catch (err) { console.error("deleteTmDeductionAPI", err); return { success:false, error:err }; }
};
