import { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import BASE_URL from '../../../backend/server/config';
import PropTypes from 'prop-types';

export default function AllowanceSummaryModal({ open, payrollId, payrollFrom, payrollUntil, onClose, refreshPayroll }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]); // [{ employee_id, name, allowances: [...], is_all_excepted }]
  const [pendingChanges, setPendingChanges] = useState(new Map());

  // Coerce payrollId to number early and use pid everywhere
  const pid = payrollId !== null && payrollId !== undefined && payrollId !== '' ? Number(payrollId) : null;

  useEffect(() => {
    if (!open) return;
    fetchSummary();
    setPendingChanges(new Map());
  }, [open, pid]);

  const fetchSummary = async () => {
    if (!pid) {
      Swal.fire('Please save payroll first', 'Create the payroll date range first to manage exceptions.', 'info');
      return;
    }
    setLoading(true);
    try {
      console.log('[AllowanceSummary] fetchSummary - calling API with payroll_id =', pid);
      const res = await axios.get(`${BASE_URL}/allowance/summary_for_payroll.php`, { params: { payroll_id: pid }});
      console.log('[AllowanceSummary] fetchSummary response:', res);
      const payload = res.data.data || [];
      const normalized = payload.map(emp => ({
        ...emp,
        is_all_excepted: !!emp.is_all_excepted,
        allowances: (emp.allowances || []).map(a => ({ ...a, is_excepted: !!a.is_excepted }))
      }));
      setData(normalized);
    } catch (err) {
      console.error('[AllowanceSummary] fetchSummary error', err);
      Swal.fire('Error', 'Failed to fetch allowance summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateEmployeeInData = (employeeId, updater) => {
    setData(prev => prev.map(emp => emp.employee_id === employeeId ? updater(emp) : emp));
  };

  // Toggle "except all" for an employee — update UI and pendingChanges
  const toggleExceptAll = (employee) => {
    console.log('[AllowanceSummary] toggleExceptAll clicked for', employee);
    const key = `emp:${employee.employee_id}:all`;
    const currentlyAllExcepted = !!employee.is_all_excepted;
    const newAllExcepted = !currentlyAllExcepted;

    updateEmployeeInData(employee.employee_id, (emp) => {
      const newAllowances = (emp.allowances || []).map(a => ({ ...a, is_excepted: newAllExcepted }));
      return { ...emp, is_all_excepted: newAllExcepted, allowances: newAllowances };
    });

    const newPending = new Map(pendingChanges);

    if (newAllExcepted) {
      newPending.set(key, { payroll_id: pid, employee_id: employee.employee_id, allowance_id: null, action: 'add' });
      for (const k of Array.from(newPending.keys())) {
        if (k.startsWith(`emp:${employee.employee_id}:allow:`)) newPending.delete(k);
      }
    } else {
      newPending.set(key, { payroll_id: pid, employee_id: employee.employee_id, allowance_id: null, action: 'remove' });
      for (const k of Array.from(newPending.keys())) {
        if (k.startsWith(`emp:${employee.employee_id}:allow:`)) newPending.delete(k);
      }
    }

    console.log('[AllowanceSummary] pendingChanges after toggleExceptAll:', Array.from(newPending.entries()));
    setPendingChanges(newPending);
  };

  // Toggle a single allowance exception (per-allowance)
  const toggleExceptAllowance = (employeeId, allowance) => {
    console.log('[AllowanceSummary] toggleExceptAllowance clicked', { employeeId, allowance });
    const key = `emp:${employeeId}:allow:${allowance.allowance_id}`;

    // find current UI state
    const emp = data.find(d => d.employee_id === employeeId);
    const allowanceFromData = emp ? emp.allowances.find(x => x.allowance_id === allowance.allowance_id) : null;
    const currentlyExcepted = !!(allowanceFromData && allowanceFromData.is_excepted);

    updateEmployeeInData(employeeId, (empRow) => {
      const newAllowances = (empRow.allowances || []).map(a => a.allowance_id === allowance.allowance_id ? { ...a, is_excepted: !currentlyExcepted } : a);
      const newIsAll = newAllowances.length > 0 && newAllowances.every(a => a.is_excepted);
      return { ...empRow, allowances: newAllowances, is_all_excepted: newIsAll };
    });

    const newPending = new Map(pendingChanges);

    if (!currentlyExcepted) {
      newPending.set(key, { payroll_id: pid, employee_id: employeeId, allowance_id: Number(allowance.allowance_id), action: 'add' });
      const allKey = `emp:${employeeId}:all`;
      if (newPending.has(allKey) && newPending.get(allKey).action === 'add') {
        newPending.delete(allKey);
      }
    } else {
      if (allowance.exception_id) {
        newPending.set(key, { payroll_id: pid, employee_id: employeeId, allowance_id: Number(allowance.allowance_id), action: 'remove', exception_id: Number(allowance.exception_id) });
      } else {
        if (newPending.has(key) && newPending.get(key).action === 'add') {
          newPending.delete(key);
        } else {
          newPending.delete(key);
        }
      }
    }

    console.log('[AllowanceSummary] pendingChanges after toggleExceptAllowance:', Array.from(newPending.entries()));
    setPendingChanges(newPending);
  };

  // saveChanges now processes creates and deletes
  const saveChanges = async () => {
    console.log('[AllowanceSummary] saveChanges invoked. pendingChanges:', Array.from(pendingChanges.entries()));
    if (pendingChanges.size === 0) {
      onClose();
      return;
    }

    const creates = [];
    const deletes = [];

    for (const [k, v] of pendingChanges.entries()) {
      if (v.action === 'add') {
        creates.push({ payroll_id: Number(v.payroll_id || pid), employee_id: v.employee_id, allowance_id: v.allowance_id === null ? null : Number(v.allowance_id), reason: 'Excepted via UI' });
      } else if (v.action === 'remove') {
        if (v.exception_id) {
          deletes.push({ exception_id: Number(v.exception_id) });
        } else {
          deletes.push({ payroll_id: Number(v.payroll_id || pid), employee_id: v.employee_id, allowance_id: v.allowance_id === null ? null : Number(v.allowance_id) });
        }
      }
    }

    console.log('[AllowanceSummary] creates payload:', creates);
    console.log('[AllowanceSummary] deletes payload:', deletes);

    try {
      setLoading(true);

      // Bulk create exceptions if any
      if (creates.length > 0) {
        const respCreate = await axios.post(`${BASE_URL}/allowance/exception_bulk_create.php`, { exceptions: creates });
        console.log('[AllowanceSummary] exception_bulk_create response:', respCreate);
      }

      // Perform deletes:
      for (const d of deletes) {
        if (d.exception_id) {
          console.log('[AllowanceSummary] deleting exception_id', d.exception_id);
          const respDel = await axios({ method: 'DELETE', url: `${BASE_URL}/allowance/exception.php`, data: { exception_id: d.exception_id }});
          console.log('[AllowanceSummary] delete by exception_id response:', respDel);
        } else {
          // call delete-by-keys helper (implement this PHP if you haven't already)
          console.log('[AllowanceSummary] deleting by keys', d);
          const respDelKeys = await axios.post(`${BASE_URL}/allowance/exception_delete_by_keys.php`, { payroll_id: d.payroll_id, employee_id: d.employee_id, allowance_id: d.allowance_id });
          console.log('[AllowanceSummary] delete-by-keys response:', respDelKeys);
        }
      }

      // Reapply allowances using payroll wrapper (fixed path)
      console.log('[AllowanceSummary] calling reapply allowances for payroll_id', pid);
      const respReapply = await axios.post(`${BASE_URL}/allowance/reapply_allowances.php`, { payroll_id: pid });
      console.log('[AllowanceSummary] reapply response:', respReapply);

      Swal.fire('Saved', 'Exceptions applied and allowances re-computed.', 'success');
      refreshPayroll && refreshPayroll();
      onClose();
    } catch (err) {
      console.error('[AllowanceSummary] saveChanges error', err);
      // show server response message if available
      const msg = err?.response?.data?.message || err.message || 'Failed to save exceptions';
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-[900px] max-h-[80vh] overflow-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">Allowance Summary & Exceptions</h3>
          <div className="text-sm text-gray-600">{payrollFrom} — {payrollUntil}</div>
        </div>

        <div>
          {loading && <div className="p-4">Loading...</div>}
          {!loading && data.length === 0 && <div className="p-4 text-sm text-gray-500">No employees with allowances found.</div>}

          {!loading && data.map(emp => (
            <div key={emp.employee_id} className="py-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{emp.employee_id} — {emp.name}</div>
                  <div className="text-xs text-gray-500">{emp.position || ''} {emp.department_name ? `• ${emp.department_name}` : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox"
                      onChange={() => toggleExceptAll(emp)}
                      checked={!!emp.is_all_excepted}
                    />
                    Except all allowances
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {emp.allowances && emp.allowances.map(a => (
                  <div key={a.allowance_id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{a.allowance_name} <span className="text-xs text-gray-500">({a.frequency})</span></div>
                      <div className="text-xs text-gray-600">{a.amount_type === 'percent' ? `${a.amount}% of ${a.percent_of}` : `₱${Number(a.amount).toFixed(2)}`}</div>
                    </div>

                    <label className="flex items-center gap-2">
                      <input type="checkbox"
                        checked={!!a.is_excepted}
                        onChange={() => toggleExceptAllowance(emp.employee_id, a)}
                      />
                      <span className="text-sm">Except</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button onClick={saveChanges} className="px-4 py-2 text-white bg-blue-600 rounded">Save Exceptions</button>
        </div>
      </div>
    </div>
  );
}

AllowanceSummaryModal.propTypes = {
  open: PropTypes.bool.isRequired,
  payrollId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  payrollFrom: PropTypes.string,
  payrollUntil: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  refreshPayroll: PropTypes.func
};
