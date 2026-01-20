// LoanJournalEntriesTable.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { X } from "lucide-react";
import useLoanJournalAPI from "../loan_hooks/useLoanJournalAPI";
import useLoanAPI from "../loan_hooks/useLoanAPI";

/**
 * LoanJournalEntriesTable
 *
 * Props:
 *  - loan_id: optional single loan id
 *  - employee_id: optional employee id
 *  - loan_ids: optional array of loan ids
 *  - initialLoans: optional array of loan objects passed from parent (preferred)
 *  - showLoanSelector: boolean (default true)
 *  - onUpdateLoanDeduction: function(total) optional callback
 *  - asModal: boolean — render within MUI Dialog when true
 *  - open: boolean — modal open state (required if asModal)
 *  - onClose: function — modal close handler (required if asModal)
 */
const LoanJournalEntriesTable = ({
  loan_id = null,
  employee_id = null,
  loan_ids = null,
  initialLoans = [],
  showLoanSelector = true,
  onUpdateLoanDeduction = () => {},
  // modal props
  asModal = false,
  open = false,
  onClose = () => {},
}) => {
  // hooks
  const { fetchJournalEntries, createJournalEntry, deleteJournalEntry } = useLoanJournalAPI();
  const { fetchLoans } = useLoanAPI();

  // stable refs to hook functions (in case hooks are re-created)
  const fetchJournalEntriesRef = useRef(fetchJournalEntries);
  const fetchLoansRef = useRef(fetchLoans);
  useEffect(() => { fetchJournalEntriesRef.current = fetchJournalEntries; }, [fetchJournalEntries]);
  useEffect(() => { fetchLoansRef.current = fetchLoans; }, [fetchLoans]);

  // state
  const [loanMap, setLoanMap] = useState({}); // loan_id -> loan object
  const [availableLoanIds, setAvailableLoanIds] = useState([]); // [loan_id,...]
  const [selectedLoanFilter, setSelectedLoanFilter] = useState("all"); // 'all' or loanId string
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    loan_id: loan_id || "",
    employee_id: employee_id || "",
    entry_type: "credit",
    amount: "",
    description: "",
    entry_date: "",
    // new optional journal metadata
    origin: "", // e.g. "payroll", "manual"
    reference_no: "",
    payroll_cutoff: "",
  });

  // stable key for loan_ids prop for deps
  const loanIdsKey = useMemo(() => {
    if (!loan_ids) return "";
    try { return JSON.stringify(loan_ids.map((x) => Number(x)).sort()); } catch { return ""; }
  }, [loan_ids]);

  // --- Load loans (use initialLoans first, otherwise fall back to fetch)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let resolved = [];

        // 1) Prefer initialLoans if provided by parent (guaranteed objects)
        if (initialLoans && Array.isArray(initialLoans) && initialLoans.length) {
          resolved = initialLoans;
        }
        // 2) If loan_ids array given (IDs only), try fetching each loan
        else if (loan_ids && Array.isArray(loan_ids) && loan_ids.length) {
          const arr = [];
          for (const id of loan_ids) {
            try {
              const r = await fetchLoansRef.current(id);
              if (Array.isArray(r)) arr.push(...r);
              else if (r && Array.isArray(r.data)) arr.push(...r.data);
              else if (r && r.loan) arr.push(r.loan);
              else if (r && r.data && r.data.length) arr.push(...r.data);
            } catch (err) {
              console.warn("fetchLoans by id failed:", id, err);
            }
          }
          resolved = arr;
        }
        // 3) If single loan_id prop, fetch it
        else if (loan_id) {
          const r = await fetchLoansRef.current(loan_id).catch(() => null);
          if (Array.isArray(r)) resolved = r;
          else if (r && Array.isArray(r.data)) resolved = r.data;
          else if (r && r.loan) resolved = [r.loan];
        }
        // 4) If employee_id provided, fetch loans for that employee
        else if (employee_id) {
          const r = await fetchLoansRef.current(employee_id).catch(() => null);
          if (Array.isArray(r)) resolved = r;
          else if (r && Array.isArray(r.data)) resolved = r.data;
          else if (r && r.loans) resolved = r.loans;
        } else {
          resolved = [];
        }

        // build map and ids
        const newMap = {};
        const newIds = [];
        (resolved || []).forEach((l) => {
          if (l && l.loan_id) {
            newMap[l.loan_id] = l;
            newIds.push(l.loan_id);
          }
        });

        newIds.sort((a, b) => a - b); // stable order
        const prevIdsKey = availableLoanIds.join(",");
        const newIdsKey = newIds.join(",");

        if (mounted && prevIdsKey !== newIdsKey) {
          setLoanMap(newMap);
          setAvailableLoanIds(newIds);

          // preserve user selection if possible, otherwise sensible default
          if (loan_id) setSelectedLoanFilter(String(loan_id));
          else if (!selectedLoanFilter || selectedLoanFilter === "all") {
            if (newIds.length === 1) setSelectedLoanFilter(String(newIds[0]));
          }

          setForm((p) => ({ ...p, loan_id: loan_id || (newIds[0] || p.loan_id), employee_id: employee_id || p.employee_id }));
        }
      } catch (err) {
        console.error("load loans error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan_id, employee_id, loanIdsKey, JSON.stringify(initialLoans)]);

  // --- When loan selection in the form changes, auto-fill description if empty ---
  useEffect(() => {
    if (!form.loan_id) return;
    const lid = Number(form.loan_id);
    const loan = loanMap[lid];
    if (loan && (!form.description || form.description.trim() === "")) {
      const loanLabelParts = [
        (loan.loan_type || "LOAN").toUpperCase(),
        loan.description || loan.loan_reference_no || "",
      ].filter(Boolean);
      const auto = loanLabelParts.join(" - ");
      setForm((p) => ({ ...p, description: auto }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.loan_id, loanMap]);

  // --- Load journal entries for selected loans (flattened fetch) ---
  const availableLoanIdsKey = useMemo(() => availableLoanIds.join(","), [availableLoanIds]);

  useEffect(() => {
    let mounted = true;
    const loadJournals = async () => {
      setLoading(true);
      try {
        // decide target loan ids
        let targets = [];
        if (selectedLoanFilter && selectedLoanFilter !== "all") {
          targets = [Number(selectedLoanFilter)];
        } else {
          targets = availableLoanIds.map((x) => Number(x)).filter(Boolean);
        }

        if (!targets.length && loan_id) targets = [Number(loan_id)];

        // fetch for each target in parallel
        const promises = targets.map(async (lid) => {
          try {
            const res = await fetchJournalEntriesRef.current(lid);
            if (!res) return [];
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.journalEntries && Array.isArray(res.journalEntries)) return res.journalEntries;
            if (res.entries && Array.isArray(res.entries)) return res.entries;
            return [];
          } catch (err) {
            console.error("fetchJournalEntries error", lid, err);
            return [];
          }
        });

        const results = (await Promise.all(promises)).flat();
        // dedupe by journal_id
        const map = new Map();
        for (const e of results) {
          if (!e || !e.journal_id) continue;
          if (!map.has(e.journal_id)) map.set(e.journal_id, e);
        }
        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.entry_date || b.created_at || 0) - new Date(a.entry_date || a.created_at || 0));

        // Only set state if changed
        const prevKey = journalEntries.map((j) => j.journal_id).join(",");
        const newKey = merged.map((j) => j.journal_id).join(",");
        if (mounted && prevKey !== newKey) {
          setJournalEntries(merged);
        }
      } catch (err) {
        console.error("loadJournals error", err);
        if (mounted) setJournalEntries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadJournals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoanFilter, availableLoanIdsKey, loan_id]);

  // --- Form handlers ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // if origin changed and no longer 'payroll', clear payroll_cutoff
    if (name === "origin") {
      setForm((p) => ({ ...p, [name]: value, payroll_cutoff: value === "payroll" ? p.payroll_cutoff : "" }));
    } else {
      setForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleAddEntry = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || isNaN(amount)) {
      alert("Amount required");
      return;
    }

    // determine target loan id
    const targetLoanId = form.loan_id || (selectedLoanFilter !== "all" ? selectedLoanFilter : (availableLoanIds.length === 1 ? availableLoanIds[0] : null));
    if (!targetLoanId) {
      alert("Please select a loan");
      return;
    }

    const payload = {
      ...form,
      loan_id: Number(targetLoanId),
      employee_id: form.employee_id || employee_id,
      // keep optional fields as-is (origin, reference_no, payroll_cutoff)
    };

    try {
      const res = await createJournalEntry(payload);
      // optimistic append if creation successful or fallback to local object
      const created = (res && (res.journal || res.created || (res.data && res.data[0]) || res)) || null;
      const entryObj = created && created.journal_id
        ? created
        : { journal_id: Math.random().toString(36).slice(2), ...payload, entry_date: payload.entry_date || new Date().toISOString() };

      setJournalEntries((prev) => [entryObj, ...prev]);
      // reset form fields except employee_id and loan selection (keep those)
      setForm((p) => ({ ...p, amount: "", description: "", entry_type: "credit", origin: "", reference_no: "", payroll_cutoff: "" }));
    } catch (err) {
      console.error("createJournalEntry error", err);
      alert("Failed to create entry");
    }
  };

  const handleDelete = async (journal_id) => {
    const ok = window.confirm("Delete this journal entry?");
    if (!ok) return;
    try {
      await deleteJournalEntry(journal_id);
      setJournalEntries((prev) => prev.filter((j) => j.journal_id !== journal_id));
    } catch (err) {
      console.error("deleteJournalEntry error", err);
      alert("Failed to delete");
    }
  };

  // --- Call parent only when total changed (prevents cascading updates) ---
  const lastTotalRef = useRef(null);
  useEffect(() => {
    const sumCredits = journalEntries.reduce((acc, e) => {
      const t = String(e.entry_type || "").toLowerCase();
      const amt = parseFloat(e.amount || 0);
      if (t === "credit") return acc + (isNaN(amt) ? 0 : amt);
      return acc;
    }, 0);
    if (lastTotalRef.current !== sumCredits) {
      lastTotalRef.current = sumCredits;
      onUpdateLoanDeduction(Number(sumCredits.toFixed(2)));
    }
  }, [journalEntries, onUpdateLoanDeduction]);

  // --- helpers and rendering data ---
  const loanOptions = useMemo(() => availableLoanIds.map((id) => {
    const loan = loanMap[id] || {};
    // display loan type and description (fallback to ref or loan number)
    const desc = loan.description || loan.loan_reference_no || `Loan #${id}`;
    const label = `${(loan.loan_type || "LOAN").toUpperCase()} — ${desc}`;
    return { id, label };
  }), [availableLoanIdsKey, loanMap]);

  const grouped = useMemo(() => {
    // group entries by loan id
    const groups = {};
    for (const e of journalEntries) {
      const lid = Number(e.loan_id || e.legacy_loan_id || e._loan_id || 0);
      if (!groups[lid]) groups[lid] = [];
      groups[lid].push(e);
    }
    if (selectedLoanFilter && selectedLoanFilter !== "all") {
      const lid = Number(selectedLoanFilter);
      return [{ loanId: lid, loanObj: loanMap[lid], entries: groups[lid] || [] }];
    }
    return availableLoanIds.map((lid) => ({ loanId: Number(lid), loanObj: loanMap[lid], entries: groups[lid] || [] }));
  }, [journalEntries, availableLoanIdsKey, selectedLoanFilter, loanMap]);

  // --- render content ---
  const content = (
    <div className="p-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-sm w-full text-[13px]">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Loan Journal Entries</h3>
        {asModal && (
          <IconButton size="small" onClick={onClose} aria-label="close">
            <X size={16} />
          </IconButton>
        )}
      </div>

      {/* Loan selector */}
      {showLoanSelector && loanOptions.length > 0 && (
        <div className="mb-3">
          <select
            value={selectedLoanFilter}
            onChange={(e) => setSelectedLoanFilter(e.target.value)}
            className="w-full p-2 mb-3 text-sm border border-gray-300 rounded-md"
          >
            <option value="all">All loans</option>
            {loanOptions.map((opt) => (
              <option key={opt.id} value={String(opt.id)}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Entry form */}
      <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-4">
        {loanOptions.length > 1 && (
          <select
            name="loan_id"
            value={form.loan_id || ""}
            onChange={(e) => setForm((p) => ({ ...p, loan_id: e.target.value }))}
            className="p-2 text-sm border border-gray-300 rounded-md"
          >
            <option value="">-- select loan --</option>
            {loanOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
        )}

        <select name="entry_type" value={form.entry_type} onChange={handleFormChange} className="p-2 text-sm border border-gray-300 rounded-md">
          <option value="debit">Debit - loan release</option>
          <option value="credit">Credit - loan payment</option>
        </select>

        <input type="number" name="amount" value={form.amount} onChange={handleFormChange} placeholder="Amount" className="p-2 text-sm border rounded-md border-gray-303" />

        {/* entry_date (single date input for entry) */}
        <input type="date" name="entry_date" value={form.entry_date} onChange={handleFormChange} className="p-2 text-sm border border-gray-300 rounded-md" />

        <input type="text" name="description" value={form.description} onChange={handleFormChange} placeholder="Remarks" className="col-span-2 p-2 text-sm border border-gray-300 rounded-md" />

        {/* New journal meta fields */}
        <input type="text" name="origin" value={form.origin} onChange={handleFormChange} placeholder="Origin (e.g. payroll/manual)" className="p-2 text-sm border border-gray-300 rounded-md" />
        <input type="text" name="reference_no" value={form.reference_no} onChange={handleFormChange} placeholder="Reference #" className="p-2 text-sm border border-gray-300 rounded-md" />

        {/* payroll_cutoff is shown only when origin === 'payroll' to avoid duplicate date selection */}
        {form.origin === "payroll" && (
          <input type="date" name="payroll_cutoff" value={form.payroll_cutoff} onChange={handleFormChange} className="p-2 text-sm border border-gray-300 rounded-md" />
        )}

        <button onClick={handleAddEntry} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
          + Add Entry
        </button>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid gap-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-4 bg-gray-100 border rounded-md shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="w-1/3 h-4 bg-gray-300 rounded" />
              <div className="w-1/4 h-4 bg-gray-300 rounded" />
              <div className="w-1/4 h-4 rounded bg-gray-303" />
              <div className="w-1/5 h-4 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* grouped display */}
          {grouped.length === 0 ? (
            <div className="p-4 text-center text-gray-500 border rounded-md">No loans/journal entries found.</div>
          ) : (
            grouped.map(({ loanId, loanObj, entries }) => (
              <div key={loanId} className="mb-4">
                {/* <-- UPDATED HEADER: show loan type + description (same as selector) --> */}
                <div className="flex items-center justify-between p-3 mb-2 border rounded bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold">
                      {loanObj
                        ? `${(loanObj.loan_type || "LOAN").toUpperCase()} — ${loanObj.description || loanObj.loan_reference_no || `Loan #${loanId}`}`
                        : `Loan #${loanId}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {loanObj?.employee_name ? `${loanObj.employee_name} (${loanObj.employee_id})` : loanObj?.employee_id || ""}
                    </div>
                  </div>
                  <div className="text-sm">
                    Balance:{" "}
                    <span className="font-semibold">
                      ₱{Number(loanObj?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {entries && entries.length ? entries.map((entry, idx) => (
                  <div key={entry.journal_id || `${loanId}-${idx}`} className="flex items-center justify-between gap-3 p-3 mb-2 bg-white border rounded shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 text-xs rounded-full ${entry.entry_type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{entry.entry_type}</div>
                      <div className="text-sm font-medium">₱{Number(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-sm text-gray-500">{entry.description || "—"}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-400">{(entry.entry_date || entry.created_at || "").split?.(" ")[0] || "N/A"}</div>
                      <button onClick={() => handleDelete(entry.journal_id)} className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700">Delete</button>
                    </div>
                  </div>
                )) : (
                  <div className="p-3 text-sm text-gray-500 border rounded">No journal entries for this loan.</div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );

  // render inside MUI Dialog if requested
  if (asModal) {
    return (
      <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Loan Journal Entries
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
            }}
            size="small"
          >
            <X size={16} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // otherwise render inline
  return content;
};

LoanJournalEntriesTable.propTypes = {
  loan_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  employee_id: PropTypes.string,
  loan_ids: PropTypes.array,
  initialLoans: PropTypes.array,
  showLoanSelector: PropTypes.bool,
  onUpdateLoanDeduction: PropTypes.func,
  asModal: PropTypes.bool,
  open: PropTypes.bool,
  onClose: PropTypes.func,
};

export default LoanJournalEntriesTable;




// // LoanJournalEntriesTable.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import PropTypes from "prop-types";
// import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
// import { X } from "lucide-react";
// import useLoanJournalAPI from "../loan_hooks/useLoanJournalAPI";
// import useLoanAPI from "../loan_hooks/useLoanAPI";

// /**
//  * LoanJournalEntriesTable
//  *
//  * Props:
//  *  - loan_id: optional single loan id
//  *  - employee_id: optional employee id
//  *  - loan_ids: optional array of loan ids
//  *  - initialLoans: optional array of loan objects passed from parent (preferred)
//  *  - showLoanSelector: boolean (default true)
//  *  - onUpdateLoanDeduction: function(total) optional callback
//  *  - asModal: boolean — render within MUI Dialog when true
//  *  - open: boolean — modal open state (required if asModal)
//  *  - onClose: function — modal close handler (required if asModal)
//  */
// const LoanJournalEntriesTable = ({
//   loan_id = null,
//   employee_id = null,
//   loan_ids = null,
//   initialLoans = [],
//   showLoanSelector = true,
//   onUpdateLoanDeduction = () => {},
//   // modal props
//   asModal = false,
//   open = false,
//   onClose = () => {},
// }) => {
//   // hooks
//   const { fetchJournalEntries, createJournalEntry, deleteJournalEntry } = useLoanJournalAPI();
//   const { fetchLoans } = useLoanAPI();

//   // stable refs to hook functions
//   const fetchJournalEntriesRef = useRef(fetchJournalEntries);
//   const fetchLoansRef = useRef(fetchLoans);
//   useEffect(() => { fetchJournalEntriesRef.current = fetchJournalEntries; }, [fetchJournalEntries]);
//   useEffect(() => { fetchLoansRef.current = fetchLoans; }, [fetchLoans]);

//   // state
//   const [loanMap, setLoanMap] = useState({});
//   const [availableLoanIds, setAvailableLoanIds] = useState([]);
//   const [selectedLoanFilter, setSelectedLoanFilter] = useState("all");
//   const [journalEntries, setJournalEntries] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [form, setForm] = useState({
//     loan_id: loan_id || "",
//     employee_id: employee_id || "",
//     entry_type: "credit",
//     amount: "",
//     description: "",
//     entry_date: "",
//   });

//   const loanIdsKey = useMemo(() => {
//     if (!loan_ids) return "";
//     try { return JSON.stringify(loan_ids.map((x) => Number(x)).sort()); } catch { return ""; }
//   }, [loan_ids]);

//   // Load loans (prefer initialLoans)
//   useEffect(() => {
//     let mounted = true;
//     const load = async () => {
//       setLoading(true);
//       try {
//         let resolved = [];

//         if (initialLoans && Array.isArray(initialLoans) && initialLoans.length) {
//           resolved = initialLoans;
//         } else if (loan_ids && Array.isArray(loan_ids) && loan_ids.length) {
//           const arr = [];
//           for (const id of loan_ids) {
//             try {
//               const r = await fetchLoansRef.current(id);
//               if (Array.isArray(r)) arr.push(...r);
//               else if (r && Array.isArray(r.data)) arr.push(...r.data);
//               else if (r && r.loan) arr.push(r.loan);
//               else if (r && r.data && r.data.length) arr.push(...r.data);
//             } catch (err) {
//               console.warn("fetchLoans by id failed:", id, err);
//             }
//           }
//           resolved = arr;
//         } else if (loan_id) {
//           const r = await fetchLoansRef.current(loan_id).catch(() => null);
//           if (Array.isArray(r)) resolved = r;
//           else if (r && Array.isArray(r.data)) resolved = r.data;
//           else if (r && r.loan) resolved = [r.loan];
//         } else if (employee_id) {
//           const r = await fetchLoansRef.current(employee_id).catch(() => null);
//           if (Array.isArray(r)) resolved = r;
//           else if (r && Array.isArray(r.data)) resolved = r.data;
//           else if (r && r.loans) resolved = r.loans;
//         } else {
//           resolved = [];
//         }

//         const newMap = {};
//         const newIds = [];
//         (resolved || []).forEach((l) => {
//           if (l && l.loan_id) {
//             newMap[l.loan_id] = l;
//             newIds.push(l.loan_id);
//           }
//         });

//         newIds.sort((a, b) => a - b);
//         const prevIdsKey = availableLoanIds.join(",");
//         const newIdsKey = newIds.join(",");

//         if (mounted && prevIdsKey !== newIdsKey) {
//           setLoanMap(newMap);
//           setAvailableLoanIds(newIds);

//           if (loan_id) setSelectedLoanFilter(String(loan_id));
//           else if (!selectedLoanFilter || selectedLoanFilter === "all") {
//             if (newIds.length === 1) setSelectedLoanFilter(String(newIds[0]));
//           }

//           setForm((p) => ({ ...p, loan_id: loan_id || (newIds[0] || p.loan_id), employee_id: employee_id || p.employee_id }));
//         }
//       } catch (err) {
//         console.error("load loans error", err);
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     load();
//     return () => { mounted = false; };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [loan_id, employee_id, loanIdsKey, JSON.stringify(initialLoans)]);

//   // Load journal entries for targets
//   const availableLoanIdsKey = useMemo(() => availableLoanIds.join(","), [availableLoanIds]);
//   useEffect(() => {
//     let mounted = true;
//     const loadJournals = async () => {
//       setLoading(true);
//       try {
//         let targets = [];
//         if (selectedLoanFilter && selectedLoanFilter !== "all") targets = [Number(selectedLoanFilter)];
//         else targets = availableLoanIds.map((x) => Number(x)).filter(Boolean);

//         if (!targets.length && loan_id) targets = [Number(loan_id)];

//         const promises = targets.map(async (lid) => {
//           try {
//             const res = await fetchJournalEntriesRef.current(lid);
//             if (!res) return [];
//             if (Array.isArray(res)) return res;
//             if (res.data && Array.isArray(res.data)) return res.data;
//             if (res.journalEntries && Array.isArray(res.journalEntries)) return res.journalEntries;
//             if (res.entries && Array.isArray(res.entries)) return res.entries;
//             return [];
//           } catch (err) {
//             console.error("fetchJournalEntries error", lid, err);
//             return [];
//           }
//         });

//         const results = (await Promise.all(promises)).flat();
//         const map = new Map();
//         for (const e of results) {
//           if (!e || !e.journal_id) continue;
//           if (!map.has(e.journal_id)) map.set(e.journal_id, e);
//         }
//         const merged = Array.from(map.values());
//         merged.sort((a, b) => new Date(b.entry_date || b.created_at || 0) - new Date(a.entry_date || a.created_at || 0));

//         const prevKey = journalEntries.map((j) => j.journal_id).join(",");
//         const newKey = merged.map((j) => j.journal_id).join(",");
//         if (mounted && prevKey !== newKey) setJournalEntries(merged);
//       } catch (err) {
//         console.error("loadJournals error", err);
//         if (mounted) setJournalEntries([]);
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadJournals();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedLoanFilter, availableLoanIdsKey, loan_id]);

//   // Form handlers
//   const handleFormChange = (e) => {
//     const { name, value } = e.target;
//     setForm((p) => ({ ...p, [name]: value }));
//   };

//   const handleAddEntry = async () => {
//     const amount = parseFloat(form.amount);
//     if (!amount || isNaN(amount)) {
//       // use SweetAlert if available style-wise
//       alert("Amount required");
//       return;
//     }

//     const targetLoanId = form.loan_id || (selectedLoanFilter !== "all" ? selectedLoanFilter : (availableLoanIds.length === 1 ? availableLoanIds[0] : null));
//     if (!targetLoanId) {
//       alert("Please select a loan");
//       return;
//     }

//     const payload = {
//       ...form,
//       loan_id: Number(targetLoanId),
//       employee_id: form.employee_id || employee_id,
//     };

//     try {
//       const res = await createJournalEntry(payload);
//       const created = (res && (res.journal || res.created || (res.data && res.data[0]) || res)) || null;
//       const entryObj = created && created.journal_id
//         ? created
//         : { journal_id: Math.random().toString(36).slice(2), ...payload, entry_date: payload.entry_date || new Date().toISOString() };

//       setJournalEntries((prev) => [entryObj, ...prev]);
//       setForm((p) => ({ ...p, amount: "", description: "", entry_type: "credit" }));
//     } catch (err) {
//       console.error("createJournalEntry error", err);
//       alert("Failed to create entry");
//     }
//   };

//   const handleDelete = async (journal_id) => {
//     const ok = window.confirm("Delete this journal entry?");
//     if (!ok) return;
//     try {
//       await deleteJournalEntry(journal_id);
//       setJournalEntries((prev) => prev.filter((j) => j.journal_id !== journal_id));
//     } catch (err) {
//       console.error("deleteJournalEntry error", err);
//       alert("Failed to delete");
//     }
//   };

//   // notify parent when total changes
//   const lastTotalRef = useRef(null);
//   useEffect(() => {
//     const sumCredits = journalEntries.reduce((acc, e) => {
//       const t = String(e.entry_type || "").toLowerCase();
//       const amt = parseFloat(e.amount || 0);
//       if (t === "credit") return acc + (isNaN(amt) ? 0 : amt);
//       return acc;
//     }, 0);
//     if (lastTotalRef.current !== sumCredits) {
//       lastTotalRef.current = sumCredits;
//       onUpdateLoanDeduction(Number(sumCredits.toFixed(2)));
//     }
//   }, [journalEntries, onUpdateLoanDeduction]);

//   // helpers
//   const loanOptions = useMemo(() => availableLoanIds.map((id) => {
//     const loan = loanMap[id] || {};
//     const label = `${(loan.loan_type || "LOAN").toUpperCase()} #${id} — bal ₱${Number(loan.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
//     return { id, label };
//   }), [availableLoanIdsKey, loanMap]);

//   const grouped = useMemo(() => {
//     const groups = {};
//     for (const e of journalEntries) {
//       const lid = Number(e.loan_id || e.legacy_loan_id || e._loan_id || 0);
//       if (!groups[lid]) groups[lid] = [];
//       groups[lid].push(e);
//     }
//     if (selectedLoanFilter && selectedLoanFilter !== "all") {
//       const lid = Number(selectedLoanFilter);
//       return [{ loanId: lid, loanObj: loanMap[lid], entries: groups[lid] || [] }];
//     }
//     return availableLoanIds.map((lid) => ({ loanId: Number(lid), loanObj: loanMap[lid], entries: groups[lid] || [] }));
//   }, [journalEntries, availableLoanIdsKey, selectedLoanFilter, loanMap]);

//   // the core UI content (so we can render it inside a Dialog or inline)
//   const content = (
//     <div className="p-4 mt-2 bg-white border border-gray-200 rounded-xl shadow-sm w-full text-[13px]">
//       {/* header */}
//       <div className="flex items-center justify-between mb-4">
//         <h3 className="text-base font-semibold text-gray-800">Loan Journal Entries</h3>
//         {asModal && (
//           <IconButton size="small" onClick={onClose} aria-label="close">
//             <X size={16} />
//           </IconButton>
//         )}
//       </div>

//       {/* loan selector */}
//       {showLoanSelector && loanOptions.length > 0 && (
//         <div className="mb-3">
//           <select
//             value={selectedLoanFilter}
//             onChange={(e) => setSelectedLoanFilter(e.target.value)}
//             className="w-full p-2 mb-3 text-sm border border-gray-300 rounded-md"
//           >
//             <option value="all">All loans</option>
//             {loanOptions.map((opt) => (
//               <option key={opt.id} value={String(opt.id)}>{opt.label}</option>
//             ))}
//           </select>
//         </div>
//       )}

//       {/* entry form */}
//       <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-4">
//         {loanOptions.length > 1 && (
//           <select
//             name="loan_id"
//             value={form.loan_id || ""}
//             onChange={(e) => setForm((p) => ({ ...p, loan_id: e.target.value }))}
//             className="p-2 text-sm border border-gray-300 rounded-md"
//           >
//             <option value="">-- select loan --</option>
//             {loanOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
//           </select>
//         )}

//         <select name="entry_type" value={form.entry_type} onChange={handleFormChange} className="p-2 text-sm border border-gray-300 rounded-md">
//           <option value="debit">Debit - loan release</option>
//           <option value="credit">Credit - loan payment</option>
//         </select>

//         <input type="number" name="amount" value={form.amount} onChange={handleFormChange} placeholder="Amount" className="p-2 text-sm border border-gray-300 rounded-md" />
//         <input type="date" name="entry_date" value={form.entry_date} onChange={handleFormChange} className="p-2 text-sm border border-gray-300 rounded-md" />
//         <input type="text" name="description" value={form.description} onChange={handleFormChange} placeholder="Remarks" className="col-span-2 p-2 text-sm border border-gray-300 rounded-md" />

//         <button onClick={handleAddEntry} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
//           + Add Entry
//         </button>
//       </div>

//       {/* loading */}
//       {loading ? (
//         <div className="grid gap-3 animate-pulse">
//           {Array.from({ length: 3 }).map((_, i) => (
//             <div key={i} className="flex flex-col gap-2 p-4 bg-gray-100 border rounded-md shadow-sm sm:flex-row sm:items-center sm:justify-between">
//               <div className="w-1/3 h-4 bg-gray-300 rounded" />
//               <div className="w-1/4 h-4 bg-gray-300 rounded" />
//               <div className="w-1/4 h-4 bg-gray-300 rounded" />
//               <div className="w-1/5 h-4 bg-gray-300 rounded" />
//             </div>
//           ))}
//         </div>
//       ) : (
//         <>
//           {grouped.length === 0 ? (
//             <div className="p-4 text-center text-gray-500 border rounded-md">No loans/journal entries found.</div>
//           ) : (
//             grouped.map(({ loanId, loanObj, entries }) => (
//               <div key={loanId} className="mb-4">
//                 <div className="flex items-center justify-between p-3 mb-2 border rounded bg-gray-50">
//                   <div>
//                     <div className="text-sm font-semibold">{loanObj ? `${(loanObj.loan_type || 'LOAN').toUpperCase()} #${loanId}` : `Loan #${loanId}`}</div>
//                     <div className="text-xs text-gray-500">{loanObj?.employee_name ? `${loanObj.employee_name} (${loanObj.employee_id})` : loanObj?.employee_id || ""}</div>
//                   </div>
//                   <div className="text-sm">Balance: <span className="font-semibold">₱{Number(loanObj?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
//                 </div>

//                 {entries && entries.length ? entries.map((entry, idx) => (
//                   <div key={entry.journal_id || `${loanId}-${idx}`} className="flex items-center justify-between gap-3 p-3 mb-2 bg-white border rounded shadow-sm">
//                     <div className="flex items-center gap-3">
//                       <div className={`px-2 py-1 text-xs rounded-full ${entry.entry_type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{entry.entry_type}</div>
//                       <div className="text-sm font-medium">₱{Number(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
//                       <div className="text-sm text-gray-500">{entry.description || "—"}</div>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <div className="text-xs text-gray-400">{(entry.entry_date || entry.created_at || "").split?.(" ")[0] || "N/A"}</div>
//                       <button onClick={() => handleDelete(entry.journal_id)} className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700">Delete</button>
//                     </div>
//                   </div>
//                 )) : (
//                   <div className="p-3 text-sm text-gray-500 border rounded">No journal entries for this loan.</div>
//                 )}
//               </div>
//             ))
//           )}
//         </>
//       )}
//     </div>
//   );

//   // render inside MUI Dialog if requested
//   if (asModal) {
//     return (
//       <Dialog open={!!open} onClose={onClose} fullWidth maxWidth="md">
//         <DialogTitle sx={{ m: 0, p: 2 }}>
//           Loan Journal Entries
//           <IconButton
//             aria-label="close"
//             onClick={onClose}
//             sx={{
//               position: "absolute",
//               right: 8,
//               top: 8,
//             }}
//             size="small"
//           >
//             <X size={16} />
//           </IconButton>
//         </DialogTitle>
//         <DialogContent dividers>
//           {content}
//         </DialogContent>
//       </Dialog>
//     );
//   }

//   // otherwise render inline
//   return content;
// };

// LoanJournalEntriesTable.propTypes = {
//   loan_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
//   employee_id: PropTypes.string,
//   loan_ids: PropTypes.array,
//   initialLoans: PropTypes.array,
//   showLoanSelector: PropTypes.bool,
//   onUpdateLoanDeduction: PropTypes.func,
//   asModal: PropTypes.bool,
//   open: PropTypes.bool,
//   onClose: PropTypes.func,
// };

// export default LoanJournalEntriesTable;




