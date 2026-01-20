// loan_components/Loan/LoanFormModal.jsx
import React, { useState, useEffect, useRef } from "react";
import useEmployeeDropdown from "../loan_hooks/useEmployeeDropdown";

const defaultLoan = {
  loan_id: null,
  employee_id: "",
  employee_name: "",
  loan_amount: "",
  date_start: "",
  description: "",
  loan_type: "company",
  deduction_schedule: "monthly",
  interest_type: "none",
  interest_rate: "0.00",
  terms: 1.0,
  // new fields
  liability_type: "cash_loan", // cash_loan | item_issue | damage | cash_advance | other
  quantity: "",
  unit_cost: "",
  total_cost: "",
  is_installment: true,
  item_id: null,
  loan_reference_no: "",
  reason: "",
  created_by: "",
  meta: "", // free-form JSON string (optional)
  // payable_mode + manual override
  payable_mode: "auto", // "auto" or "manual"
  payable_per_term: "", // numeric string or number
};

const LoanFormModal = ({ isOpen, onClose, onSubmit, selectedLoan }) => {
  const [loanData, setLoanData] = useState(defaultLoan);
  const { employees } = useEmployeeDropdown();
  const manualInputRef = useRef(null);

  // UI helper classes for red/green highlight control (only related to input styling)
  const baseInputClass = "w-full p-2 border rounded";
  const greenClass = "border-green-500 bg-green-50";
  const redClass = "border-red-500 bg-red-50";

  useEffect(() => {
    if (selectedLoan) {
      // normalize to include new fields if absent
      // try to read payable_mode and manual value from meta if not provided directly
      let pmode = selectedLoan.payable_mode ?? null;
      let ppm = selectedLoan.payable_per_term ?? null;
      if (!pmode && selectedLoan.meta) {
        try {
          const metaObj =
            typeof selectedLoan.meta === "string" ? JSON.parse(selectedLoan.meta) : selectedLoan.meta;
          if (metaObj && typeof metaObj === "object") {
            if (metaObj.payable_mode) pmode = metaObj.payable_mode;
            if (typeof metaObj.payable_per_term_manual !== "undefined")
              ppm = metaObj.payable_per_term_manual;
          }
        } catch {}
      }
      setLoanData((prev) => ({
        ...defaultLoan,
        ...selectedLoan,
        // ensure types
        quantity: selectedLoan.quantity ?? "",
        unit_cost: selectedLoan.unit_cost ?? "",
        total_cost: selectedLoan.total_cost ?? selectedLoan.loan_amount ?? "",
        // keep backward compat: if backend uses older naming, normalize (prefer provided liability_type)
        liability_type:
          selectedLoan.liability_type ?? (selectedLoan.loan_type ? "cash_loan" : "cash_loan"),
        is_installment:
          typeof selectedLoan.is_installment === "undefined"
            ? true
            : Boolean(selectedLoan.is_installment),
        meta:
          selectedLoan.meta && typeof selectedLoan.meta === "string"
            ? selectedLoan.meta
            : selectedLoan.meta
            ? JSON.stringify(selectedLoan.meta)
            : "",
        reason: selectedLoan.reason ?? "",
        // payable mode + value
        payable_mode: pmode ?? (selectedLoan.payable_mode ?? "auto"),
        payable_per_term: ppm !== null && ppm !== undefined ? ppm : selectedLoan.payable_per_term ?? "",
      }));
    } else {
      setLoanData(defaultLoan);
    }
  }, [selectedLoan]);

  // auto compute total_cost when quantity/unit_cost change (only when user didn't explicitly set total_cost)
  useEffect(() => {
    const q = parseFloat(loanData.quantity || 0);
    const u = parseFloat(loanData.unit_cost || 0);
    if (!isNaN(q) && !isNaN(u) && q > 0 && u >= 0) {
      const calc = (q * u).toFixed(2);
      setLoanData((p) => ({ ...p, total_cost: calc }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanData.quantity, loanData.unit_cost]);

  // Sync loan_amount with total_cost when in item_issue mode.
  useEffect(() => {
    if (loanData.liability_type === "item_issue") {
      // If total_cost present, keep loan_amount equal to total_cost.
      const t = loanData.total_cost ?? "";
      if (t !== "" && Number(loanData.loan_amount) !== Number(t)) {
        setLoanData((p) => ({ ...p, loan_amount: t }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanData.liability_type, loanData.total_cost]);

  // live compute payable_per_term when payable_mode === 'auto'
  useEffect(() => {
    if (loanData.payable_mode === "auto") {
      const totalCost = (() => {
        const tc = Number(String(loanData.total_cost || "").replace(/,/g, ""));
        if (!isNaN(tc) && tc > 0) return tc;
        const qc = Number(String(loanData.quantity || "").replace(/,/g, ""));
        const uc = Number(String(loanData.unit_cost || "").replace(/,/g, ""));
        if (!isNaN(qc) && !isNaN(uc) && qc > 0) return qc * uc;
        const la = Number(String(loanData.loan_amount || "").replace(/,/g, ""));
        if (!isNaN(la)) return la;
        return 0;
      })();

      let termsN = Number(String(loanData.terms || 0).replace(",", "."));
      if (isNaN(termsN) || termsN <= 0) termsN = 1.0;
      const multiplier = loanData.deduction_schedule === "semi-monthly" ? 2 : 1;
      const computed = termsN > 0 ? Number((totalCost / (termsN * multiplier)).toFixed(2)) : 0;
      setLoanData((p) => ({ ...p, payable_per_term: computed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loanData.payable_mode,
    loanData.total_cost,
    loanData.terms,
    loanData.deduction_schedule,
    loanData.quantity,
    loanData.unit_cost,
    loanData.loan_amount,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === "checkbox" ? checked : value;

    // if editing loan_amount while in item_issue mode, prevent changes (it should be controlled by total_cost)
    if (name === "loan_amount" && loanData.liability_type === "item_issue") {
      return;
    }

    // normalize comma -> dot for numeric fields
    if (
      ["terms", "interest_rate", "unit_cost", "total_cost", "loan_amount", "payable_per_term"].includes(
        name
      ) &&
      typeof val === "string"
    ) {
      val = val.replace(",", ".");
    }

    // If user types in payable_per_term and we're in manual mode, keep the raw input (but normalized) so it will be sent.
    // Also coerce to number if it's a valid numeric string.
    if (name === "payable_per_term") {
      const cleaned = String(val).trim();
      // If empty string, keep it as empty to allow clearing.
      if (cleaned === "") {
        setLoanData((prev) => ({ ...prev, [name]: "" }));
        return;
      }
      // If numeric, store as string that looks numeric (we will parse it on submit)
      const cleanedNoCommas = cleaned.replace(/,/g, "");
      if (!isNaN(Number(cleanedNoCommas))) {
        // keep consistent string/number (string is fine, handleSubmit will convert)
        setLoanData((prev) => ({ ...prev, [name]: cleanedNoCommas }));
        return;
      } else {
        // non-numeric input — still set it (will be ignored server-side)
        setLoanData((prev) => ({ ...prev, [name]: cleaned }));
        return;
      }
    }

    setLoanData((prev) => ({ ...prev, [name]: val }));
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    const selected = employees.find((emp) => emp.employee_id === empId);
    setLoanData((prev) => ({
      ...prev,
      employee_id: selected?.employee_id ?? empId,
      employee_name: selected?.employee_name ?? prev.employee_name,
    }));
  };

  // Safe conversion helpers
  const safeNumber = (v) => {
    if (v === null || typeof v === "undefined") return null;
    if (v === "") return null;
    if (typeof v === "number" && !isNaN(v)) return Number(v);
    const cleaned = String(v).replace(/,/g, "").trim();
    if (cleaned === "") return null;
    return isNaN(cleaned) ? null : Number(cleaned);
  };
  const safeString = (v) => {
    if (v === null || typeof v === "undefined") return null;
    return String(v);
  };

  // Ensure focus when switching to manual override (UX nicety)
  useEffect(() => {
    if (loanData.payable_mode === "manual" && manualInputRef.current) {
      // slight timeout to allow input to appear
      setTimeout(() => manualInputRef.current.focus(), 50);
    }
  }, [loanData.payable_mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build clean payload to avoid DB/SQL type surprises
    const rawItemId = loanData.item_id ?? null;
    let item_id_to_send = null;
    let metaObj = null;

    // prepare meta (attempt parse if provided)
    if (loanData.meta && String(loanData.meta).trim() !== "") {
      try {
        const parsed = JSON.parse(String(loanData.meta));
        metaObj = parsed && typeof parsed === "object" ? parsed : { raw: String(loanData.meta) };
      } catch {
        metaObj = { raw: String(loanData.meta) };
      }
    }

    // if item_id is numeric, send as integer; otherwise, keep raw item id inside meta
    if (rawItemId !== null && rawItemId !== "") {
      const s = String(rawItemId).trim();
      if (/^\d+$/.test(s)) {
        item_id_to_send = Number(s);
      } else {
        // non-numeric item id: store in meta.raw_item_id so nothing lost
        metaObj = { ...(metaObj || {}), raw_item_id: s };
        item_id_to_send = null;
      }
    }

    // compute total_cost fallback
    let totalCost = safeNumber(loanData.total_cost);
    const unit_cost_n = safeNumber(loanData.unit_cost);
    const qty_n = safeNumber(loanData.quantity);
    const loan_amount_n = safeNumber(loanData.loan_amount);

    if (totalCost === null) {
      if (unit_cost_n !== null && qty_n !== null) {
        totalCost = Number((unit_cost_n * qty_n).toFixed(2));
      } else {
        totalCost = loan_amount_n !== null ? loan_amount_n : 0;
      }
    }

    // determine payable_mode and final payable_per_term to send
    const payable_mode_to_send = loanData.payable_mode === "manual" ? "manual" : "auto";
    let payable_per_term_to_send = null;
    let include_payable_per_term_in_payload = false;

    if (payable_mode_to_send === "manual") {
      // ensure we parse numeric strings with comma/dot
      const raw = loanData.payable_per_term;
      if (typeof raw !== "undefined" && raw !== null && raw !== "") {
        const norm = String(raw).replace(",", ".");
        if (!isNaN(Number(norm))) {
          payable_per_term_to_send = Number(norm);
          include_payable_per_term_in_payload = true;
        } else {
          // not numeric -> we'll leave it null so server falls back to auto (or existing manual)
          payable_per_term_to_send = null;
          include_payable_per_term_in_payload = false;
        }
      } else {
        // empty manual -> let server fall back to existing manual or auto
        payable_per_term_to_send = null;
        include_payable_per_term_in_payload = false;
      }
    } else {
      // auto: compute same as server: multiplier and terms
      const termsN = Number(String(loanData.terms || 1).replace(",", "."));
      const multiplier = loanData.deduction_schedule === "semi-monthly" ? 2 : 1;
      const finalTerms = !isNaN(termsN) && termsN > 0 ? termsN : 1.0;
      payable_per_term_to_send = finalTerms > 0 ? Number((totalCost / (finalTerms * multiplier)).toFixed(2)) : 0.0;
      include_payable_per_term_in_payload = true; // include auto preview value
    }

    // attach payable_mode info to metaObj too so server can pick it up (server stores it in meta if not provided explicitly)
    metaObj = { ...(metaObj || {}) };
    metaObj.payable_mode = payable_mode_to_send;
    if (payable_mode_to_send === "manual" && payable_per_term_to_send !== null) {
      metaObj.payable_per_term_manual = payable_per_term_to_send;
    } else {
      delete metaObj.payable_per_term_manual;
    }

    // final payload
    const payload = {
      loan_id: loanData.loan_id ?? undefined,
      employee_id: safeString(loanData.employee_id),
      employee_name: safeString(loanData.employee_name),
      // Base amount: prefer totalCost (items) else loan_amount
      loan_amount: Number(totalCost || 0),
      date_start: safeString(loanData.date_start) || new Date().toISOString().slice(0, 10),
      description: safeString(loanData.description),
      loan_type: safeString(loanData.loan_type),
      deduction_schedule: safeString(loanData.deduction_schedule),
      interest_type: safeString(loanData.interest_type),
      interest_rate: Number(safeNumber(loanData.interest_rate) || 0),
      terms: Number(safeNumber(loanData.terms) || 1),

      // new fields (clean)
      liability_type: safeString(loanData.liability_type),
      quantity: qty_n !== null ? Number(qty_n) : null,
      unit_cost: unit_cost_n !== null ? Number(unit_cost_n) : null,
      total_cost: totalCost !== null ? Number(totalCost) : null,
      is_installment: loanData.is_installment ? 1 : 0,
      item_id: item_id_to_send,
      loan_reference_no: loanData.loan_reference_no ? String(loanData.loan_reference_no) : null,
      reason: loanData.reason ? String(loanData.reason) : null,
      created_by: loanData.created_by ? String(loanData.created_by) : null,
      meta: Object.keys(metaObj).length ? JSON.stringify(metaObj) : null,

      // payable mode + value (explicit)
      payable_mode: payable_mode_to_send,
      // only include numeric if we have one (manual numeric or computed preview)
    };

    if (include_payable_per_term_in_payload && typeof payable_per_term_to_send === "number") {
      payload.payable_per_term = Number(payable_per_term_to_send);
    }

    // *** DEBUG: print outgoing payload to console so you can inspect exactly what will be sent ***
    console.log("LoanFormModal: outgoing payload", payload);

    // call parent submit handler (unchanged behavior)
    onSubmit(payload);
  };

  if (!isOpen) return null;

  const isEditMode = Boolean(loanData.loan_id);

  // loan amount is required if not an item_issue with total_cost present
  const loanAmountRequired = !(loanData.liability_type === "item_issue" && loanData.total_cost);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
      <div className="w-full max-w-3xl bg-white rounded shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "Edit Loan (limited fields)" : "Add Liability / Loan"}
          </h2>
        </div>

        {/* Scrollable form area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto pr-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">
            {/* Employee */}
            <div className="col-span-2">
              <label className="block font-medium">Employee</label>
              <select
                name="employee_id"
                value={loanData.employee_id}
                onChange={handleEmployeeSelect}
                className="w-full p-2 border rounded"
                disabled={isEditMode}
                required
              >
                <option value="">-- Select Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500">Choose employee for this liability.</div>
            </div>

            {/* liability_type */}
            <div>
              <label className="block font-medium">Liability Type</label>
              <select
                name="liability_type"
                value={loanData.liability_type}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="cash_loan">Cash Loan</option>
                <option value="item_issue">Item (equipment, goods)</option>
                <option value="damage">Damage Deduction</option>
                <option value="cash_advance">Cash Advance (CA)</option>
                <option value="other">Other</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">Type decides fields & behavior.</div>
            </div>

            {/* loan_type (legacy) */}
            <div>
              <label className="block font-medium">Loan Type</label>
              <select
                name="loan_type"
                value={loanData.loan_type}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                disabled={isEditMode}
              >
                <option value="company">Company</option>
                <option value="sss">SSS</option>
                <option value="pagibig">Pag-IBIG</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">Legacy classification (optional).</div>
            </div>

            {/* loan_amount (for non-item_issue liabilities). required only when not item_issue-with-total_cost */}
            <div>
              <label className="block font-medium">Loan Amount (₱)</label>
              <input
                type="number"
                name="loan_amount"
                value={loanData.loan_amount}
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 bg-white border rounded"
                disabled={isEditMode || loanData.liability_type === "item_issue"}
                required={loanAmountRequired}
              />
              {loanData.liability_type === "item_issue" ? (
                <div className="mt-1 text-xs text-gray-500">
                  Derived from Total Cost for item liabilities (not editable).
                </div>
              ) : (
                <div className="mt-1 text-xs text-gray-500">Enter amount to be financed/charged.</div>
              )}
            </div>

            {/* date_start */}
            <div>
              <label className="block font-medium">Date Start</label>
              <input
                type="date"
                name="date_start"
                value={loanData.date_start}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                disabled={isEditMode}
              />
              <div className="mt-1 text-xs text-gray-500">Effective date for schedule.</div>
            </div>

            {/* Reference (shown when loan_type is sss/pagibig) */}
            {["sss", "pagibig"].includes(String(loanData.loan_type).toLowerCase()) && (
              <div>
                <label className="block font-medium">Loan Reference No</label>
                <input
                  type="text"
                  name="loan_reference_no"
                  value={loanData.loan_reference_no || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="Optional reference"
                  disabled={isEditMode}
                />
                <div className="mt-1 text-xs text-gray-500">Use official reference (if any).</div>
              </div>
            )}

            {/* quantity / unit_cost (for item_issue) */}
            {loanData.liability_type === "item_issue" && (
              <>
                <div>
                  <label className="block font-medium">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={loanData.quantity}
                    onChange={handleChange}
                    step="1"
                    min="1"
                    className="w-full p-2 border rounded"
                  />
                  <div className="mt-1 text-xs text-gray-500">Number of items.</div>
                </div>

                <div>
                  <label className="block font-medium">Unit Cost (₱)</label>
                  <input
                    type="number"
                    name="unit_cost"
                    value={loanData.unit_cost}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full p-2 border rounded"
                  />
                  <div className="mt-1 text-xs text-gray-500">Price per item.</div>
                </div>

                <div className="col-span-2">
                  <label className="block font-medium">Total Cost (₱)</label>
                  <input
                    type="number"
                    name="total_cost"
                    value={loanData.total_cost}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full p-2 border rounded"
                  />
                  <div className="mt-1 text-xs text-gray-500">Quantity × Unit Cost (editable).</div>
                </div>
              </>
            )}

            {/* description */}
            <div className="col-span-2">
              <label className="block font-medium">Description</label>
              <textarea
                name="description"
                value={loanData.description}
                onChange={handleChange}
                rows={2}
                className="w-full p-2 border rounded"
              />
              <div className="mt-1 text-xs text-gray-500">Short note shown on reports/journal.</div>
            </div>

            {/* Deduction Schedule */}
            <div>
              <label className="block font-medium">Deduction Schedule</label>
              <select
                name="deduction_schedule"
                value={loanData.deduction_schedule}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="monthly">Monthly</option>
                <option value="semi-monthly">Semi-Monthly</option>
                <option value="current-payroll">Current Payroll</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">How often to deduct from payroll.</div>
            </div>

            {/* terms */}
            <div>
              <label className="block font-medium">Terms (periods)</label>
              <input
                type="number"
                name="terms"
                value={loanData.terms}
                onChange={handleChange}
                min="0.01"
                step="0.01"
                className={`${baseInputClass} ${loanData.payable_mode === "auto" ? greenClass : redClass}`}
              />
              <div className="mt-1 text-xs text-gray-500">Number of pay periods to collect.</div>
            </div>

            {/* Payable per term mode: Auto vs Manual */}
            <div className="col-span-2">
              <label className="block font-medium">Payable per term</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payable_mode"
                    value="auto"
                    checked={loanData.payable_mode === "auto"}
                    onChange={() => setLoanData((p) => ({ ...p, payable_mode: "auto" }))}
                  />
                  <span>Auto (calculate)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="payable_mode"
                    value="manual"
                    checked={loanData.payable_mode === "manual"}
                    onChange={() => setLoanData((p) => ({ ...p, payable_mode: "manual" }))}
                  />
                  <span>Manual (override)</span>
                </label>
              </div>

              {/* When in manual mode show editable input; in auto show computed amount (readonly) */}
              {loanData.payable_mode === "manual" ? (
                <input
                  ref={manualInputRef}
                  type="number"
                  name="payable_per_term"
                  value={loanData.payable_per_term ?? ""}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className={`${baseInputClass} ${loanData.payable_mode === "manual" ? greenClass : redClass} mt-2`}
                  placeholder="Enter amount to be deducted per term"
                />
              ) : (
                <input
                  type="number"
                  name="payable_per_term"
                  value={loanData.payable_per_term ?? ""}
                  readOnly
                  className={`${baseInputClass} ${loanData.payable_mode === "auto" ? redClass : greenClass} mt-2 bg-gray-50`}
                />
              )}
              <div className="mt-1 text-xs text-gray-500">
                Choose Auto to calculate from total, terms & schedule, or Manual to override the per-term amount.
              </div>
            </div>

            {/* interest */}
            <div>
              <label className="block font-medium">Interest Type</label>
              <select
                name="interest_type"
                value={loanData.interest_type}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="none">None</option>
                <option value="fixed">Fixed</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">Apply interest to the liability.</div>
            </div>

            {loanData.interest_type !== "none" && (
              <div>
                <label className="block font-medium">Interest Rate (%)</label>
                <input
                  type="number"
                  name="interest_rate"
                  value={loanData.interest_rate}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full p-2 border rounded"
                />
                <div className="mt-1 text-xs text-gray-500">Rate applied per term or monthly.</div>
              </div>
            )}

            {/* is_installment */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_installment"
                checked={!!loanData.is_installment}
                onChange={handleChange}
                id="is_installment_toggle"
              />
              <label htmlFor="is_installment_toggle" className="font-medium">
                Is Installment
              </label>
              <div className="mt-1 text-xs text-gray-500">If checked, repayment is in installments.</div>
            </div>

            {/* item id */}
            <div>
              <label className="block font-medium">Item ID (optional)</label>
              <input
                type="text"
                name="item_id"
                value={loanData.item_id ?? ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
              <div className="mt-1 text-xs text-gray-500">Use for inventory serial/ID. Non-numeric saved in meta.</div>
            </div>

            {/* reason (shown for sss / pagibig) */}
            {["sss", "pagibig"].includes(String(loanData.loan_type).toLowerCase()) && (
              <div className="col-span-2">
                <label className="block font-medium">Reason (optional)</label>
                <input
                  type="text"
                  name="reason"
                  value={loanData.reason || ""}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Emergency, Housing"
                />
                <div className="mt-1 text-xs text-gray-500">Reason/context for special loan types.</div>
              </div>
            )}

            <div className="col-span-2">
              <label className="block font-medium">Meta (JSON) - optional</label>
              <textarea
                name="meta"
                value={loanData.meta}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                rows={2}
              />
              <div className="mt-1 text-xs text-gray-500">Extra data (serials, notes). Prefer valid JSON.</div>
            </div>

            {/* action buttons spacer added so buttons stay after long form */}
            <div className="col-span-2"></div>

            <div className="flex justify-end col-span-2 gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                {isEditMode ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoanFormModal;



// // loan_components/Loan/LoanFormModal.jsx
// import React, { useState, useEffect } from "react";
// import useEmployeeDropdown from "../loan_hooks/useEmployeeDropdown";

// const defaultLoan = {
//   loan_id: null,
//   employee_id: "",
//   employee_name: "",
//   loan_amount: "",
//   date_start: "",
//   description: "",
//   loan_type: "company",
//   deduction_schedule: "monthly",
//   interest_type: "none",
//   interest_rate: "0.00",
//   number_of_months: "",
// };

// const LoanFormModal = ({ isOpen, onClose, onSubmit, selectedLoan }) => {
//   const [loanData, setLoanData] = useState(defaultLoan);
//   const { employees } = useEmployeeDropdown();

//   useEffect(() => {
//     if (selectedLoan) {
//       setLoanData({ ...selectedLoan });
//     } else {
//       setLoanData(defaultLoan);
//     }
//   }, [selectedLoan]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setLoanData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     const preparedData = {
//       ...loanData,
//       terms: parseInt(loanData.number_of_months) || 1,
//     };

//     delete preparedData.number_of_months;

//     onSubmit(preparedData);
//   };

//   if (!isOpen) return null;

//   const isEditMode = Boolean(loanData.loan_id);

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
//       <div className="w-full max-w-2xl p-6 bg-white rounded shadow-lg">
//         <h2 className="mb-4 text-lg font-semibold">
//           {isEditMode ? "Edit Loan (Preview Only)" : "Add Loan"}
//         </h2>

//         <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">
//           {/* Employee (not editable in edit mode) */}
//           <label className="block font-medium">Select Employee</label>
//           <select
//             name="employee_id"
//             value={loanData.employee_id}
//             onChange={(e) => {
//               const selected = employees.find((emp) => emp.employee_id === e.target.value);
//               setLoanData((prev) => ({
//                 ...prev,
//                 employee_id: selected.employee_id,
//                 employee_name: selected.employee_name,
//               }));
//             }}
//             className="w-full p-2 border rounded"
//             disabled={isEditMode}
//             required
//           >
//             <option value="">-- Select Employee --</option>
//             {employees.map((emp) => (
//               <option key={emp.employee_id} value={emp.employee_id}>
//                 {emp.employee_name} ({emp.employee_id})
//               </option>
//             ))}
//           </select>

//           {/* Loan Amount (locked in edit mode) */}
//           <div>
//             <label className="block font-medium">
//               Loan Amount (₱) {isEditMode && <span className="text-xs text-gray-500">(Locked)</span>}
//             </label>
//             <input
//               type="number"
//               name="loan_amount"
//               value={loanData.loan_amount}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//               step="0.01"
//               required
//               disabled={isEditMode}
//             />
//           </div>

//           {/* Date Start (locked in edit mode) */}
//           <div>
//             <label className="block font-medium">
//               Date Start {isEditMode && <span className="text-xs text-gray-500">(Locked)</span>}
//             </label>
//             <input
//               type="date"
//               name="date_start"
//               value={loanData.date_start}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//               required
//               disabled={isEditMode}
//             />
//           </div>

//           {/* Description (Editable) */}
//           <div className="col-span-2">
//             <label className="block font-medium">
//               Description <span className="text-xs text-blue-500">(Editable)</span>
//             </label>
//             <textarea
//               name="description"
//               value={loanData.description}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//               rows={2}
//             />
//           </div>

//           {/* Loan Type (locked in edit mode) */}
//           <div>
//             <label className="block font-medium">
//               Loan Type {isEditMode && <span className="text-xs text-gray-500">(Locked)</span>}
//             </label>
//             <select
//               name="loan_type"
//               value={loanData.loan_type}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//               disabled={isEditMode}
//             >
//               <option value="company">Company</option>
//               <option value="sss">SSS</option>
//               <option value="pagibig">Pag-IBIG</option>
//             </select>
//           </div>

//           {/* Deduction Schedule (Editable) */}
//           <div>
//             <label className="block font-medium">
//               Deduction Schedule <span className="text-xs text-blue-500">(Editable)</span>
//             </label>
//             <select
//               name="deduction_schedule"
//               value={loanData.deduction_schedule}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="monthly">Monthly</option>
//               <option value="semi-monthly">Semi-Monthly</option>
//               <option value="current-payroll">Current Payroll</option>
//             </select>
//           </div>

//           {/* Interest Type (Editable) */}
//           <div>
//             <label className="block font-medium">
//               Interest Type <span className="text-xs text-blue-500">(Editable)</span>
//             </label>
//             <select
//               name="interest_type"
//               value={loanData.interest_type}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="none">None</option>
//               <option value="fixed">Fixed</option>
//               <option value="monthly">Monthly</option>
//             </select>
//           </div>

//           {/* Loan Reference + Reason (only when loan_type is sss/pagibig) */}
//           {["sss", "pagibig"].includes(loanData.loan_type) && (
//             <>
//               <div className="col-span-2">
//                 <label className="block font-medium">
//                   Loan Reference No {isEditMode && <span className="text-xs text-gray-500">(Locked)</span>}
//                 </label>
//                 <input
//                   type="text"
//                   name="loan_reference_no"
//                   value={loanData.loan_reference_no}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded"
//                   placeholder="e.g. SSS-2025-001"
//                   required
//                   disabled={isEditMode}
//                 />
//               </div>

//               <div className="col-span-2">
//                 <label className="block font-medium">
//                   Reason (optional) <span className="text-xs text-blue-500">(Editable)</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="reason"
//                   value={loanData.reason}
//                   onChange={handleChange}
//                   className="w-full p-2 border rounded"
//                   placeholder="e.g. Emergency, Housing"
//                 />
//               </div>
//             </>
//           )}

//           {/* Interest Rate (Editable if shown) */}
//           {loanData.interest_type !== "none" && (
//             <div>
//               <label className="block font-medium">
//                 Interest Rate (%) <span className="text-xs text-blue-500">(Editable)</span>
//               </label>
//               <input
//                 type="number"
//                 name="interest_rate"
//                 value={loanData.interest_rate}
//                 onChange={handleChange}
//                 className="w-full p-2 border rounded"
//                 step="0.01"
//               />
//             </div>
//           )}

//           {/* Months to Pay (Locked in edit mode) */}
//           <div>
//             <label className="block font-medium">
//               Months to Pay {isEditMode && <span className="text-xs text-gray-500">(Locked)</span>}
//             </label>
//             <input
//               type="number"
//               name="number_of_months"
//               value={loanData.terms}
//               onChange={handleChange}
//               className="w-full p-2 border rounded"
//               min="1"
//               required
//               disabled={isEditMode}
//             />
//           </div>

//           <div className="flex justify-end col-span-2 gap-2 mt-4">
//             <button
//               type="button"
//               onClick={onClose}
//               className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
//             >
//               Cancel
//             </button>
//             <button
//               type="submit"
//               className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
//             >
//               {isEditMode ? "Update" : "Create"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default LoanFormModal;
