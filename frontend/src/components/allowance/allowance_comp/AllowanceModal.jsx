import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import BASE_URL from '../../../../backend/server/config';
import { Dialog, DialogTitle, DialogContent, Button, CircularProgress } from '@mui/material';

export default function AllowanceModal({ open, onClose, payrollFrom, payrollUntil, refreshPayroll }) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [allowances, setAllowances] = useState([]);
  const [form, setForm] = useState({
    allowance_id: null,
    allowance_name: '',
    amount: '',
    amount_type: 'fixed',
    percent_of: 'basic_salary',
    frequency: 'monthly',
    prorate_if_partial: true,
    start_date: '',
    end_date: ''
  });

  /**
   * Helper to show SweetAlert and ensure it stays above MUI Dialogs.
   * Accepts either an options object (same as Swal.fire) or a simple title string.
   * Returns the Swal promise so callers can await results (confirmations etc).
   */
  const showSwal = (options) => {
    const cfg = (typeof options === 'string') ? { title: options } : { ...(options || {}) };
    // inject didOpen to bump z-index of the swal2 container to top-level
    const originalDidOpen = cfg.didOpen;
    cfg.didOpen = () => {
      try {
        const el = document.querySelector('.swal2-container');
        if (el) {
          // set a high z-index so swal floats above MUI Dialogs
          el.style.zIndex = '9999';
        }
      } catch (e) {
        // ignore
      }
      if (typeof originalDidOpen === 'function') originalDidOpen();
    };
    return Swal.fire(cfg);
  };

  // load employees when modal opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      await fetchActiveEmployees();
      setAllowances([]);
      setForm({
        allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
        percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
        start_date: '', end_date: ''
      });
    })();
  }, [open]);

  // auto-select first employee after employees loaded
  useEffect(() => {
    if (employees && employees.length > 0) {
      if (!selectedEmployee || !employees.find(e => e.employee_id === selectedEmployee.employee_id)) {
        const first = employees[0];
        setSelectedEmployee(first);
        fetchAllowances(first.employee_id);
      }
    } else {
      setSelectedEmployee(null);
      setAllowances([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees]);

  // fetch employees (correct endpoint)
  const fetchActiveEmployees = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/allowance/list_active.php`);
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error(err);
      await showSwal({ title: 'Error', text: 'Failed to fetch employees', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowances = async (employeeId) => {
    if (!employeeId) {
      setAllowances([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/allowance/list_allowance.php`, {
        params: { employee_id: employeeId, from: payrollFrom, until: payrollUntil, active: 1 }
      });
      setAllowances(res.data.data || []);
    } catch (err) {
      console.error(err);
      await showSwal({ title: 'Error', text: 'Failed to fetch allowances', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onEmployeeSelect = (emp) => {
    setSelectedEmployee(emp);
    fetchAllowances(emp.employee_id);
    setForm({
      allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
      percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
      start_date: '', end_date: ''
    });
  };

  const onEditClick = (a) => {
    setForm({
      allowance_id: a.allowance_id,
      allowance_name: a.allowance_name,
      amount: a.amount,
      amount_type: a.amount_type,
      percent_of: a.percent_of || 'basic_salary',
      frequency: a.frequency,
      prorate_if_partial: !!a.prorate_if_partial,
      start_date: a.start_date || '',
      end_date: a.end_date || ''
    });
    setTimeout(() => {
      const el = document.querySelector('input[name="allowance_name"]');
      if (el) el.focus();
    }, 60);
  };

  const onSave = async () => {
    if (!selectedEmployee) {
      await showSwal({ title: 'Select employee', text: 'Please select an employee', icon: 'warning' });
      return;
    }
    if (!form.allowance_name || form.amount === '' || form.amount === null) {
      await showSwal({ title: 'Missing fields', text: 'Enter name and amount', icon: 'warning' });
      return;
    }

    const payload = {
      employee_id: selectedEmployee.employee_id,
      allowance_name: form.allowance_name,
      amount: form.amount,
      amount_type: form.amount_type,
      percent_of: form.percent_of,
      frequency: form.frequency,
      prorate_if_partial: form.prorate_if_partial ? 1 : 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null
    };
    console.log('onsave from allowance modal payload', payload);

    try {
      setLoading(true);
      if (form.allowance_id) {
        payload.allowance_id = form.allowance_id;
        const res = await axios.post(`${BASE_URL}/allowance/update_allowance.php`, payload);
        if (res.data.success) {
          await showSwal({ title: 'Saved', text: 'Allowance updated', icon: 'success' });
        } else {
          await showSwal({ title: 'Error', text: res.data.message || 'Failed to update', icon: 'error' });
        }
      } else {
        const res = await axios.post(`${BASE_URL}/allowance/create_allowance.php`, payload);
        if (res.data.success) {
          await showSwal({ title: 'Saved', text: 'Allowance created', icon: 'success' });
        } else {
          await showSwal({ title: 'Error', text: res.data.message || 'Failed to create', icon: 'error' });
        }
      }

      await fetchAllowances(selectedEmployee.employee_id);
      refreshPayroll && refreshPayroll();

      setForm({
        allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
        percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
        start_date: '', end_date: ''
      });
    } catch (err) {
      console.error(err);
      await showSwal({ title: 'Error', text: 'Request failed', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (allowanceId) => {
    const r = await showSwal({
      title: 'Delete?',
      text: 'This will deactivate the allowance (soft-delete).',
      showCancelButton: true,
      icon: 'warning',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });

    if (!r.isConfirmed) return;
    try {
      setLoading(true);
      const res = await axios.post(`${BASE_URL}/allowance/delete_allowance.php`, { allowance_id: allowanceId });
      if (res.data.success) {
        await showSwal({ title: 'Deleted', text: 'Allowance removed', icon: 'success' });
        if (selectedEmployee) await fetchAllowances(selectedEmployee.employee_id);
        refreshPayroll && refreshPayroll();
      } else {
        await showSwal({ title: 'Error', text: res.data.message || 'Failed to delete', icon: 'error' });
      }
    } catch (err) {
      console.error(err);
      await showSwal({ title: 'Error', text: 'Delete failed', icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="7xl"
      fullWidth
      // keep the Dialog z-index unchanged; we force SweetAlert above instead.
      // ensure Dialog's root doesn't inadvertently cover swal container (defensive)
      PaperProps={{ style: { zIndex: 1200 } }}
      BackdropProps={{ style: { zIndex: 1100 } }}
    >
      <DialogTitle className="flex items-center justify-between">
        <div className="text-lg font-semibold">Allowances</div>
        <div className="text-sm text-gray-500">{payrollFrom} — {payrollUntil}</div>
      </DialogTitle>

      <DialogContent dividers className="p-4" style={{ height: '75vh' }}>
        {loading && (
          <div className="flex justify-center mb-3">
            <CircularProgress size={28} />
          </div>
        )}

        {/* TOP: Form (full width) */}
        <div className="p-4 mb-4 bg-white rounded shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            {/* Name */}
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium text-gray-700">Allowance Name</label>
              <input
                name="allowance_name"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={form.allowance_name}
                onChange={e => setForm(s => ({ ...s, allowance_name: e.target.value }))}
                placeholder="e.g., Transportation"
              />
            </div>

            {/* Amount */}
            <div className="w-40">
              <label className="block mb-1 text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={form.amount}
                onChange={e => setForm(s => ({ ...s, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Type */}
            <div className="w-36">
              <label className="block mb-1 text-sm font-medium text-gray-700">Type</label>
              <select
                className="w-full px-2 py-2 border rounded focus:outline-none"
                value={form.amount_type}
                onChange={e => setForm(s => ({ ...s, amount_type: e.target.value }))}
              >
                <option value="fixed">Fixed</option>
                <option value="percent">Percent</option>
              </select>
            </div>

            {/* Frequency */}
            <div className="w-44">
              <label className="block mb-1 text-sm font-medium text-gray-700">Frequency</label>
              <select
                className="w-full px-2 py-2 border rounded focus:outline-none"
                value={form.frequency}
                onChange={e => setForm(s => ({ ...s, frequency: e.target.value }))}
              >
                <option value="monthly">Monthly</option>
                <option value="semi-monthly">Semi-monthly</option>
              </select>
            </div>

            {/* Prorate */}
            {/* <div className="flex items-center space-x-2">
              <input id="prorate" type="checkbox" checked={form.prorate_if_partial} onChange={e => setForm(s => ({ ...s, prorate_if_partial: e.target.checked }))} />
              <label htmlFor="prorate" className="text-sm text-gray-700">Prorate if partial</label>
            </div> */}

            {/* Buttons */}
            <div className="flex items-center ml-auto space-x-2">
              <button
                type="button"
                className="px-3 py-2 text-sm text-gray-700 border rounded hover:bg-gray-50"
                onClick={() => setForm({
                  allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
                  percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
                  start_date: '', end_date: ''
                })}
              >
                Clear
              </button>

              <button
                type="button"
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
                onClick={onSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : (form.allowance_id ? 'Update' : 'Save')}
              </button>
            </div>
          </div>

          {/* second row: dates */}
          <div className="flex flex-col gap-3 mt-3 md:flex-row">
            <div className="w-full md:w-1/3">
              <label className="block mb-1 text-sm text-gray-600">Start Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.start_date || ''} onChange={e => setForm(s => ({ ...s, start_date: e.target.value }))} />
            </div>
            <div className="w-full md:w-1/3">
              <label className="block mb-1 text-sm text-gray-600">End Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.end_date || ''} onChange={e => setForm(s => ({ ...s, end_date: e.target.value }))} />
            </div>
            <div className="flex items-end w-full text-sm text-gray-500 md:w-1/3">
              <div>Payroll: <span className="ml-2 font-medium text-gray-700">{payrollFrom} — {payrollUntil}</span></div>
            </div>
          </div>
        </div>

        {/* BOTTOM: two-column row (employees | allowances) */}
        <div className="flex flex-col md:flex-row gap-4 h-[calc(100%-200px)]">
          {/* Employees list */}
          <div className="p-3 overflow-auto bg-white border rounded md:w-1/3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Active Employees</div>
              <div className="text-xs text-gray-500">{employees.length} active</div>
            </div>

            {employees.length === 0 ? (
              <div className="text-sm text-gray-500">No active employees found.</div>
            ) : (
              <ul>
                {employees.map(e => {
                  const selected = selectedEmployee && selectedEmployee.employee_id === e.employee_id;
                  return (
                    <li
                      key={e.employee_id}
                      onClick={() => onEmployeeSelect(e)}
                      className={`p-2 rounded cursor-pointer mb-1 ${selected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}
                    >
                      <div className="text-sm font-medium">{e.employee_id} — {e.first_name} {e.last_name}</div>
                      <div className="text-xs text-gray-500">{e.position || e.department_name || ''}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Allowances list */}
          <div className="flex flex-col p-3 overflow-auto bg-white border rounded md:flex-1">
            <div className="mb-2">
              <div className="text-sm font-medium">Allowances for {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : '—'}</div>
            </div>

            <div className="flex-1 overflow-auto">
              {(!selectedEmployee) && (
                <div className="text-sm text-gray-500">Select an employee to view allowances.</div>
              )}

              {selectedEmployee && allowances.length === 0 && (
                <div className="text-sm text-gray-500">No allowances found for this employee. Use the form above to add one.</div>
              )}

              {allowances.map(a => (
                <div key={a.allowance_id} className="flex items-center justify-between p-3 mb-2 border rounded">
                  <div>
                    <div className="text-sm font-medium">{a.allowance_name} <span className="text-xs text-gray-500">({a.frequency})</span></div>
                    <div className="text-xs text-gray-500">{a.amount_type === 'percent' ? `${a.amount}% of ${a.percent_of || 'basic_salary'}` : `₱${Number(a.amount).toFixed(2)}`}</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="px-2 py-1 text-sm border rounded bg-yellow-50" onClick={() => onEditClick(a)}>Edit</button>
                    <button className="px-2 py-1 text-sm text-red-600 border rounded bg-red-50" onClick={() => onDelete(a.allowance_id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* small footer area inside allowances panel */}
            <div className="mt-2 text-xs text-gray-400">
              Tip: Click an allowance to edit. Save button is on the top form.
            </div>
          </div>
        </div>
      </DialogContent>

      <div className="flex justify-end p-3">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}

AllowanceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  payrollFrom: PropTypes.string,
  payrollUntil: PropTypes.string,
  refreshPayroll: PropTypes.func
};



// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import PropTypes from 'prop-types';
// import Swal from 'sweetalert2';
// import BASE_URL from '../../../../backend/server/config';
// import { Dialog, DialogTitle, DialogContent, Button, CircularProgress } from '@mui/material';

// export default function AllowanceModal({ open, onClose, payrollFrom, payrollUntil, refreshPayroll }) {
//   const [loading, setLoading] = useState(false);
//   const [employees, setEmployees] = useState([]);
//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [allowances, setAllowances] = useState([]);
//   const [form, setForm] = useState({
//     allowance_id: null,
//     allowance_name: '',
//     amount: '',
//     amount_type: 'fixed',
//     percent_of: 'basic_salary',
//     frequency: 'monthly',
//     prorate_if_partial: true,
//     start_date: '',
//     end_date: ''
//   });

//   // load employees when modal opens
//   useEffect(() => {
//     if (!open) return;
//     (async () => {
//       await fetchActiveEmployees();
//       setAllowances([]);
//       setForm({
//         allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
//         percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
//         start_date: '', end_date: ''
//       });
//     })();
//   }, [open]);

//   // auto-select first employee after employees loaded
//   useEffect(() => {
//     if (employees && employees.length > 0) {
//       if (!selectedEmployee || !employees.find(e => e.employee_id === selectedEmployee.employee_id)) {
//         const first = employees[0];
//         setSelectedEmployee(first);
//         fetchAllowances(first.employee_id);
//       }
//     } else {
//       setSelectedEmployee(null);
//       setAllowances([]);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [employees]);

//   // fetch employees (correct endpoint)
//   const fetchActiveEmployees = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get(`${BASE_URL}/allowance/list_active.php`);
//       setEmployees(res.data.data || []);
//     } catch (err) {
//       console.error(err);
//       Swal.fire('Error', 'Failed to fetch employees', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchAllowances = async (employeeId) => {
//     if (!employeeId) {
//       setAllowances([]);
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await axios.get(`${BASE_URL}/allowance/list_allowance.php`, {
//         params: { employee_id: employeeId, from: payrollFrom, until: payrollUntil, active: 1 }
//       });
//       setAllowances(res.data.data || []);
//     } catch (err) {
//       console.error(err);
//       Swal.fire('Error', 'Failed to fetch allowances', 'error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onEmployeeSelect = (emp) => {
//     setSelectedEmployee(emp);
//     fetchAllowances(emp.employee_id);
//     setForm({
//       allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
//       percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
//       start_date: '', end_date: ''
//     });
//   };

//   const onEditClick = (a) => {
//     setForm({
//       allowance_id: a.allowance_id,
//       allowance_name: a.allowance_name,
//       amount: a.amount,
//       amount_type: a.amount_type,
//       percent_of: a.percent_of || 'basic_salary',
//       frequency: a.frequency,
//       prorate_if_partial: !!a.prorate_if_partial,
//       start_date: a.start_date || '',
//       end_date: a.end_date || ''
//     });
//     setTimeout(() => {
//       const el = document.querySelector('input[name="allowance_name"]');
//       if (el) el.focus();
//     }, 60);
//   };

//   const onSave = async () => {
//     if (!selectedEmployee) return Swal.fire('Select employee','Please select an employee','warning');
//     if (!form.allowance_name || form.amount === '' || form.amount === null) return Swal.fire('Missing fields','Enter name and amount','warning');

//     const payload = {
//       employee_id: selectedEmployee.employee_id,
//       allowance_name: form.allowance_name,
//       amount: form.amount,
//       amount_type: form.amount_type,
//       percent_of: form.percent_of,
//       frequency: form.frequency,
//       prorate_if_partial: form.prorate_if_partial ? 1 : 0,
//       start_date: form.start_date || null,
//       end_date: form.end_date || null
//     };
//     console.log('onsave from allowance modal payload', payload);

//     try {
//       setLoading(true);
//       if (form.allowance_id) {
//         payload.allowance_id = form.allowance_id;
//         const res = await axios.post(`${BASE_URL}/allowance/update_allowance.php`, payload);
//         if (res.data.success) Swal.fire('Saved','Allowance updated','success');
//         else Swal.fire('Error', res.data.message || 'Failed to update', 'error');
//       } else {
//         const res = await axios.post(`${BASE_URL}/allowance/create_allowance.php`, payload);
//         if (res.data.success) Swal.fire('Saved','Allowance created','success');
//         else Swal.fire('Error', res.data.message || 'Failed to create', 'error');
//       }

//       await fetchAllowances(selectedEmployee.employee_id);
//       refreshPayroll && refreshPayroll();

//       setForm({
//         allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
//         percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
//         start_date: '', end_date: ''
//       });
//     } catch (err) {
//       console.error(err);
//       Swal.fire('Error','Request failed','error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const onDelete = async (allowanceId) => {
//     const r = await Swal.fire({ title: 'Delete?', text: 'This will deactivate the allowance (soft-delete).', showCancelButton: true });
//     if (!r.isConfirmed) return;
//     try {
//       setLoading(true);
//       const res = await axios.post(`${BASE_URL}/allowance/delete_allowance.php`, { allowance_id: allowanceId });
//       if (res.data.success) {
//         Swal.fire('Deleted','Allowance removed','success');
//         if (selectedEmployee) await fetchAllowances(selectedEmployee.employee_id);
//         refreshPayroll && refreshPayroll();
//       } else {
//         Swal.fire('Error', res.data.message || 'Failed to delete', 'error');
//       }
//     } catch (err) {
//       console.error(err);
//       Swal.fire('Error','Delete failed','error');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="7xl" fullWidth>
//       <DialogTitle className="flex items-center justify-between">
//         <div className="text-lg font-semibold">Allowances</div>
//         <div className="text-sm text-gray-500">{payrollFrom} — {payrollUntil}</div>
//       </DialogTitle>

//       <DialogContent dividers className="p-4" style={{ height: '75vh' }}>
//         {loading && (
//           <div className="flex justify-center mb-3">
//             <CircularProgress size={28} />
//           </div>
//         )}

//         {/* TOP: Form (full width) */}
//         <div className="p-4 mb-4 bg-white rounded shadow-sm">
//           <div className="flex flex-col gap-3 md:flex-row md:items-end">
//             {/* Name */}
//             <div className="flex-1">
//               <label className="block mb-1 text-sm font-medium text-gray-700">Allowance Name</label>
//               <input
//                 name="allowance_name"
//                 className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
//                 value={form.allowance_name}
//                 onChange={e => setForm(s => ({ ...s, allowance_name: e.target.value }))}
//                 placeholder="e.g., Transportation"
//               />
//             </div>

//             {/* Amount */}
//             <div className="w-40">
//               <label className="block mb-1 text-sm font-medium text-gray-700">Amount</label>
//               <input
//                 type="number"
//                 className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200"
//                 value={form.amount}
//                 onChange={e => setForm(s => ({ ...s, amount: e.target.value }))}
//                 placeholder="0.00"
//               />
//             </div>

//             {/* Type */}
//             <div className="w-36">
//               <label className="block mb-1 text-sm font-medium text-gray-700">Type</label>
//               <select
//                 className="w-full px-2 py-2 border rounded focus:outline-none"
//                 value={form.amount_type}
//                 onChange={e => setForm(s => ({ ...s, amount_type: e.target.value }))}
//               >
//                 <option value="fixed">Fixed</option>
//                 <option value="percent">Percent</option>
//               </select>
//             </div>

//             {/* Frequency */}
//             <div className="w-44">
//               <label className="block mb-1 text-sm font-medium text-gray-700">Frequency</label>
//               <select
//                 className="w-full px-2 py-2 border rounded focus:outline-none"
//                 value={form.frequency}
//                 onChange={e => setForm(s => ({ ...s, frequency: e.target.value }))}
//               >
//                 <option value="monthly">Monthly</option>
//                 <option value="semi-monthly">Semi-monthly</option>
//               </select>
//             </div>

//             {/* Prorate */}
//             <div className="flex items-center space-x-2">
//               <input id="prorate" type="checkbox" checked={form.prorate_if_partial} onChange={e => setForm(s => ({ ...s, prorate_if_partial: e.target.checked }))} />
//               <label htmlFor="prorate" className="text-sm text-gray-700">Prorate if partial</label>
//             </div>

//             {/* Buttons */}
//             <div className="flex items-center ml-auto space-x-2">
//               <button
//                 type="button"
//                 className="px-3 py-2 text-sm text-gray-700 border rounded hover:bg-gray-50"
//                 onClick={() => setForm({
//                   allowance_id: null, allowance_name: '', amount: '', amount_type: 'fixed',
//                   percent_of: 'basic_salary', frequency: 'monthly', prorate_if_partial: true,
//                   start_date: '', end_date: ''
//                 })}
//               >
//                 Clear
//               </button>

//               <button
//                 type="button"
//                 className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
//                 onClick={onSave}
//                 disabled={loading}
//               >
//                 {loading ? 'Saving...' : (form.allowance_id ? 'Update' : 'Save')}
//               </button>
//             </div>
//           </div>

//           {/* second row: dates */}
//           <div className="flex flex-col gap-3 mt-3 md:flex-row">
//             <div className="w-full md:w-1/3">
//               <label className="block mb-1 text-sm text-gray-600">Start Date</label>
//               <input type="date" className="w-full px-3 py-2 border rounded" value={form.start_date || ''} onChange={e => setForm(s => ({ ...s, start_date: e.target.value }))} />
//             </div>
//             <div className="w-full md:w-1/3">
//               <label className="block mb-1 text-sm text-gray-600">End Date</label>
//               <input type="date" className="w-full px-3 py-2 border rounded" value={form.end_date || ''} onChange={e => setForm(s => ({ ...s, end_date: e.target.value }))} />
//             </div>
//             <div className="flex items-end w-full text-sm text-gray-500 md:w-1/3">
//               <div>Payroll: <span className="ml-2 font-medium text-gray-700">{payrollFrom} — {payrollUntil}</span></div>
//             </div>
//           </div>
//         </div>

//         {/* BOTTOM: two-column row (employees | allowances) */}
//         <div className="flex flex-col md:flex-row gap-4 h-[calc(100%-200px)]">
//           {/* Employees list */}
//           <div className="p-3 overflow-auto bg-white border rounded md:w-1/3">
//             <div className="flex items-center justify-between mb-2">
//               <div className="text-sm font-medium">Active Employees</div>
//               <div className="text-xs text-gray-500">{employees.length} active</div>
//             </div>

//             {employees.length === 0 ? (
//               <div className="text-sm text-gray-500">No active employees found.</div>
//             ) : (
//               <ul>
//                 {employees.map(e => {
//                   const selected = selectedEmployee && selectedEmployee.employee_id === e.employee_id;
//                   return (
//                     <li
//                       key={e.employee_id}
//                       onClick={() => onEmployeeSelect(e)}
//                       className={`p-2 rounded cursor-pointer mb-1 ${selected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'}`}
//                     >
//                       <div className="text-sm font-medium">{e.employee_id} — {e.first_name} {e.last_name}</div>
//                       <div className="text-xs text-gray-500">{e.position || e.department_name || ''}</div>
//                     </li>
//                   );
//                 })}
//               </ul>
//             )}
//           </div>

//           {/* Allowances list */}
//           <div className="flex flex-col p-3 overflow-auto bg-white border rounded md:flex-1">
//             <div className="mb-2">
//               <div className="text-sm font-medium">Allowances for {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : '—'}</div>
//             </div>

//             <div className="flex-1 overflow-auto">
//               {(!selectedEmployee) && (
//                 <div className="text-sm text-gray-500">Select an employee to view allowances.</div>
//               )}

//               {selectedEmployee && allowances.length === 0 && (
//                 <div className="text-sm text-gray-500">No allowances found for this employee. Use the form above to add one.</div>
//               )}

//               {allowances.map(a => (
//                 <div key={a.allowance_id} className="flex items-center justify-between p-3 mb-2 border rounded">
//                   <div>
//                     <div className="text-sm font-medium">{a.allowance_name} <span className="text-xs text-gray-500">({a.frequency})</span></div>
//                     <div className="text-xs text-gray-500">{a.amount_type === 'percent' ? `${a.amount}% of ${a.percent_of || 'basic_salary'}` : `₱${Number(a.amount).toFixed(2)}`}</div>
//                   </div>

//                   <div className="flex items-center space-x-2">
//                     <button className="px-2 py-1 text-sm border rounded bg-yellow-50" onClick={() => onEditClick(a)}>Edit</button>
//                     <button className="px-2 py-1 text-sm text-red-600 border rounded bg-red-50" onClick={() => onDelete(a.allowance_id)}>Delete</button>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* small footer area inside allowances panel */}
//             <div className="mt-2 text-xs text-gray-400">
//               Tip: Click an allowance to edit. Save button is on the top form.
//             </div>
//           </div>
//         </div>
//       </DialogContent>

//       <div className="flex justify-end p-3">
//         <Button onClick={onClose}>Close</Button>
//       </div>
//     </Dialog>
//   );
// }

// AllowanceModal.propTypes = {
//   open: PropTypes.bool.isRequired,
//   onClose: PropTypes.func.isRequired,
//   payrollFrom: PropTypes.string,
//   payrollUntil: PropTypes.string,
//   refreshPayroll: PropTypes.func
// };
