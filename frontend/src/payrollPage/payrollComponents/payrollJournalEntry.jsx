// LoanJournalEntriesTable (payroll) — grouped + loan selector (inline)
import React, { useEffect, useMemo, useRef, useState } from "react";
import useLoanJournalAPI from "../../components/loan/loan_hooks/useLoanJournalAPI";
import useLoanAPI from "../../components/loan/loan_hooks/useLoanAPI";
import ModalWrapper from "../../utils/ModalWrapper";
import LoanPage from "../../components/loan/LoanPage";

/**
 * Props:
 *  - loan_id (optional) : prefer showing journal for single loan
 *  - employee_id (optional)
 *  - payroll (required) : object with date_from and date_until and maybe loans[]
 *  - onUpdateLoanDeduction(total) (optional)
 *
 * This component will:
 *  - prefer payroll.loans if present (use that data)
 *  - otherwise fetch loans for employee
 *  - fetch journal entries for the target loan(s)
 *  - show a selector (All / loan#) and grouped entries per loan
 */
const LoanJournalEntriesTable = ({ loan_id, employee_id, payroll, onUpdateLoanDeduction }) => {
  const { fetchJournalEntries: fetchJournalEntriesAPI, createJournalEntry, deleteJournalEntry } = useLoanJournalAPI();
  const { fetchLoans } = useLoanAPI();

  // keep stable refs to API funcs
  const fetchJournalEntriesRef = useRef(fetchJournalEntriesAPI);
  const fetchLoansRef = useRef(fetchLoans);
  useEffect(() => { fetchJournalEntriesRef.current = fetchJournalEntriesAPI; }, [fetchJournalEntriesAPI]);
  useEffect(() => { fetchLoansRef.current = fetchLoans; }, [fetchLoans]);

  const [showLoanModal, setShowLoanModal] = useState(false);

  // local form state (entry)
  const [form, setForm] = useState({
    loan_id: loan_id || "",
    employee_id: employee_id || "",
    entry_type: "credit",
    amount: "",
    description: "",
    entry_date: "",
  });

  // loans & journal state
  const [loanMap, setLoanMap] = useState({}); // loan_id -> loan object
  const [availableLoanIds, setAvailableLoanIds] = useState([]); // ordered array of loan_ids
  const [selectedLoanFilter, setSelectedLoanFilter] = useState("all"); // 'all' or loanId string
  const [journalEntries, setJournalEntries] = useState([]); // merged journal entries for selected target(s)
  const [loading, setLoading] = useState(false);

  // pagination for entries display
  const [visibleCount, setVisibleCount] = useState(5);

  // compute payroll cutoff range (Date objects)
  const payrollFrom = payroll?.date_from ? new Date(payroll.date_from) : null;
  const payrollUntil = payroll?.date_until ? new Date(payroll.date_until) : null;

  // helper: format peso
  const formatPeso = (val) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(val || 0));

  // --- 1) Load loans list (prefer payroll.loans if present) ---
  useEffect(() => {
    let mounted = true;
    const loadLoans = async () => {
      setLoading(true);
      try {
        let resolved = [];

        // prefer payroll.loans (passed from parent)
        if (payroll && Array.isArray(payroll.loans) && payroll.loans.length) {
          resolved = payroll.loans;
        } else if (loan_id) {
          const r = await fetchLoansRef.current(loan_id).catch(() => null);
          if (r && Array.isArray(r.data)) resolved = r.data;
          else if (r && r.loan) resolved = [r.loan];
          else if (Array.isArray(r)) resolved = r;
        } else if (employee_id) {
          // fetch loans for employee
          const r = await fetchLoansRef.current(employee_id).catch(() => null);
          if (r && Array.isArray(r.data)) resolved = r.data;
          else if (r && r.loans) resolved = r.loans;
          else if (Array.isArray(r)) resolved = r;
        } else {
          resolved = [];
        }

        // build map + ids, prioritize loans with balance > 0 (active first ordering)
        const map = {};
        const ids = [];
        (resolved || []).forEach((l) => {
          if (l && l.loan_id) {
            map[l.loan_id] = l;
            ids.push(l.loan_id);
          }
        });

        // stable order: active loans first then by id
        ids.sort((a, b) => {
          const la = Number(map[a]?.balance || 0);
          const lb = Number(map[b]?.balance || 0);
          if ((la > 0) !== (lb > 0)) return la > 0 ? -1 : 1; // active first
          return a - b;
        });

        const prev = availableLoanIds.join(",");
        const now = ids.join(",");

        if (mounted && prev !== now) {
          setLoanMap(map);
          setAvailableLoanIds(ids);

          // sensible defaults:
          if (loan_id) setSelectedLoanFilter(String(loan_id));
          else if (ids.length === 1) setSelectedLoanFilter(String(ids[0]));

          setForm((p) => ({ ...p, loan_id: loan_id || (ids[0] || p.loan_id), employee_id: employee_id || p.employee_id }));
        }
      } catch (err) {
        console.error("loadLoans error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLoans();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payroll?.loans && JSON.stringify(payroll.loans), loan_id, employee_id]);

  // --- 2) Load journal entries for target loans (parallel fetch + merge) ---
  const availableLoanIdsKey = useMemo(() => availableLoanIds.join(","), [availableLoanIds]);
  useEffect(() => {
    let mounted = true;

    const loadJournals = async () => {
      setLoading(true);
      try {
        // determine targets
        let targets = [];
        if (selectedLoanFilter && selectedLoanFilter !== "all") {
          targets = [Number(selectedLoanFilter)];
        } else {
          targets = availableLoanIds.map((x) => Number(x)).filter(Boolean);
        }
        if (!targets.length && loan_id) targets = [Number(loan_id)];

        // parallel fetch per loan id
        const promises = targets.map(async (lid) => {
          try {
            const res = await fetchJournalEntriesRef.current(lid);
            // our API might return { success, data: [] } or array directly
            if (!res) return [];
            if (Array.isArray(res)) return res;
            if (res.data && Array.isArray(res.data)) return res.data;
            if (res.journalEntries && Array.isArray(res.journalEntries)) return res.journalEntries;
            return [];
          } catch (err) {
            console.error("fetchJournalEntries error for", lid, err);
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

        // sort by entry_date desc
        merged.sort((a, b) => new Date(b.entry_date || b.created_at || 0) - new Date(a.entry_date || a.created_at || 0));

        // only set if changed
        const prevKey = journalEntries.map((j) => j.journal_id).join(",");
        const newKey = merged.map((j) => j.journal_id).join(",");
        if (mounted && prevKey !== newKey) setJournalEntries(merged);
      } catch (err) {
        console.error("loadJournals error:", err);
        if (mounted) setJournalEntries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadJournals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLoanFilter, availableLoanIdsKey, loan_id]);

  // --- 3) Keep form synced with props ---
  useEffect(() => {
    setForm((p) => ({ ...p, loan_id: loan_id || p.loan_id, employee_id: employee_id || p.employee_id }));
  }, [loan_id, employee_id]);

  // --- 4) Notify parent about total deduction inside payroll cutoff ---
  useEffect(() => {
    if (typeof onUpdateLoanDeduction === "function") {
      const totalCredits = journalEntries
        .filter((e) => String(e.entry_type).toLowerCase() === "credit")
        .filter((e) => {
          if (!e.entry_date || !payrollFrom || !payrollUntil) return false;
          const entryDate = new Date(e.entry_date);
          return entryDate >= payrollFrom && entryDate <= payrollUntil;
        })
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

      onUpdateLoanDeduction(Number(totalCredits || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalEntries, payroll?.date_from, payroll?.date_until]);

  // --- Form handlers ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleAddEntry = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || isNaN(amount)) return alert("Amount required");
    if (!form.entry_date) return alert("Entry date required");

    // determine which loan to apply: explicit form.loan_id or selected filter or single available loan
    const targetLoan = form.loan_id || (selectedLoanFilter !== "all" ? selectedLoanFilter : (availableLoanIds.length === 1 ? availableLoanIds[0] : null));
    if (!targetLoan) return alert("Please select a loan");

    const payload = {
      loan_id: Number(targetLoan),
      employee_id: form.employee_id || employee_id,
      entry_type: form.entry_type,
      amount: amount,
      description: form.description,
      entry_date: form.entry_date,
    };

    try {
      const res = await createJournalEntry(payload);
      if (res && res.success) {
        // refresh journals for the affected loan(s)
        const refetchIds = (selectedLoanFilter && selectedLoanFilter !== "all") ? [Number(selectedLoanFilter)] : availableLoanIds.map((x) => Number(x));
        await Promise.all(refetchIds.map((lid) => fetchJournalEntriesRef.current(lid)));

        // re-merge results
        const rePromises = refetchIds.map(async (lid) => {
          const r = await fetchJournalEntriesRef.current(lid);
          if (!r) return [];
          if (Array.isArray(r)) return r;
          if (r.data && Array.isArray(r.data)) return r.data;
          if (r.journalEntries && Array.isArray(r.journalEntries)) return r.journalEntries;
          return [];
        });
        const reResults = (await Promise.all(rePromises)).flat();
        const map = new Map();
        for (const e of reResults) {
          if (!e || !e.journal_id) continue;
          if (!map.has(e.journal_id)) map.set(e.journal_id, e);
        }
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.entry_date || b.created_at || 0) - new Date(a.entry_date || a.created_at || 0));
        setJournalEntries(merged);

        // clear form fields but keep employee_id
        setForm((p) => ({ ...p, amount: "", description: "", entry_type: "credit" }));

        // optionally refresh loans (if balances changed) — try to fetch loans for employee
        if (employee_id) {
          try {
            const loanRes = await fetchLoansRef.current(employee_id);
            if (loanRes) {
              let resolved = [];
              if (Array.isArray(loanRes)) resolved = loanRes;
              else if (loanRes.data && Array.isArray(loanRes.data)) resolved = loanRes.data;
              else if (loanRes.loans && Array.isArray(loanRes.loans)) resolved = loanRes.loans;
              const newMap = { ...loanMap };
              const newIdsSet = new Set(availableLoanIds);
              resolved.forEach((l) => {
                if (l && l.loan_id) {
                  newMap[l.loan_id] = l;
                  newIdsSet.add(l.loan_id);
                }
              });
              const newIds = Array.from(newIdsSet).sort((a, b) => a - b);
              setLoanMap(newMap);
              setAvailableLoanIds(newIds);
            }
          } catch (err) {
            // ignore
          }
        }
      } else {
        alert("Failed to save: " + (res?.message || "Unknown error"));
      }
    } catch (err) {
      console.error("createJournalEntry error:", err);
      alert("Failed to create entry");
    }
  };

  const handleDelete = async (journal_id) => {
    const ok = window.confirm("Delete this journal entry?");
    if (!ok) return;
    try {
      const res = await deleteJournalEntry(journal_id);
      if (res && res.success) {
        // remove locally
        setJournalEntries((prev) => prev.filter((j) => j.journal_id !== journal_id));
      } else {
        alert("Delete failed");
      }
    } catch (err) {
      console.error("deleteJournalEntry error:", err);
      alert("Failed to delete");
    }
  };

  // displayed entries slice (for Show More)
  const displayedEntries = useMemo(() => {
    // if filter specific => show entries for that loan_id only
    if (selectedLoanFilter && selectedLoanFilter !== "all") {
      return journalEntries.filter((j) => Number(j.loan_id) === Number(selectedLoanFilter)).slice(0, visibleCount);
    }
    // otherwise show merged list paginated
    return journalEntries.slice(0, visibleCount);
  }, [journalEntries, selectedLoanFilter, visibleCount]);

  // grouped entries by loan id for display details (keeps order from availableLoanIds)
  const grouped = useMemo(() => {
    const groups = {};
    for (const e of journalEntries) {
      const lid = Number(e.loan_id || e.legacy_loan_id || 0);
      if (!groups[lid]) groups[lid] = [];
      groups[lid].push(e);
    }
    return availableLoanIds.map((lid) => ({ loanId: lid, loanObj: loanMap[lid], entries: groups[lid] || [] }));
  }, [journalEntries, availableLoanIds, loanMap]);

  // compute total credits for this payroll cutoff (used by header)
  const totalCredit = useMemo(() => {
    return journalEntries
      .filter((e) => String(e.entry_type).toLowerCase() === "credit")
      .filter((e) => {
        if (!e.entry_date || !payrollFrom || !payrollUntil) return false;
        const entryDate = new Date(e.entry_date);
        return entryDate >= payrollFrom && entryDate <= payrollUntil;
      })
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  }, [journalEntries, payroll?.date_from, payroll?.date_until]);

  // loan options for select dropdown — show loan type + description/ref/Loan #id
  const loanOptions = useMemo(() => {
    return availableLoanIds.map((id) => {
      const l = loanMap[id] || {};
      const desc = l.description || l.loan_reference_no || `Loan #${id}`;
      const label = `${(l.loan_type || "LOAN").toUpperCase()} — ${desc} • bal ${formatPeso(l.balance || 0)}`;
      return { id, label };
    });
  }, [availableLoanIds, loanMap]);

  return (
    <div className="flex flex-col w-full h-full p-4 mt-4 text-sm bg-white border border-gray-200 rounded-md shadow-md">
      <h3 className="mb-3 text-base font-semibold text-gray-800">Loan Journal Entries</h3>

      {/* Entry form row */}
      <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-5">
        {/* loan selector for form when multiple loans */}
        {loanOptions.length > 1 ? (
          <select
            name="loan_id"
            value={form.loan_id || ""}
            onChange={handleFormChange}
            className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none"
            disabled={!availableLoanIds.length}
          >
            <option value="">-- select loan --</option>
            {loanOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <select
            name="entry_type"
            value={form.entry_type}
            onChange={handleFormChange}
            disabled={!availableLoanIds.length}
            className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="debit">Debit - loan release</option>
            <option value="credit">Credit - loan payment</option>
          </select>
        )}

        {/* if multiple loans, show entry_type next */}
        {loanOptions.length > 1 ? (
          <select
            name="entry_type"
            value={form.entry_type}
            onChange={handleFormChange}
            className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none"
          >
            <option value="debit">Debit - loan release</option>
            <option value="credit">Credit - loan payment</option>
          </select>
        ) : null}

        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleFormChange}
          placeholder="Amount"
          className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none"
          disabled={!availableLoanIds.length}
        />
        <input
          type="date"
          name="entry_date"
          value={form.entry_date}
          onChange={handleFormChange}
          className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none"
          disabled={!availableLoanIds.length}
        />
        <input
          type="text"
          name="description"
          value={form.description}
          onChange={handleFormChange}
          placeholder="Remarks"
          className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none"
          disabled={!availableLoanIds.length}
        />

        <button
          onClick={handleAddEntry}
          disabled={!availableLoanIds.length}
          className="px-4 py-2 text-sm text-white transition bg-blue-600 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          + Add Entry
        </button>
      </div>

      {/* total credits for this cutoff */}
      <div className="flex justify-between p-2 mb-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-md">
        <span>Total Credits (This Cutoff):</span>
        <span className="text-red-600">{formatPeso(totalCredit)}</span>
      </div>

      {/* loan-level selector (All / each loan) */}
      <div className="mb-3">
        <select
          value={selectedLoanFilter}
          onChange={(e) => {
            setSelectedLoanFilter(e.target.value);
            // reset visible count to default when filter changes
            setVisibleCount(5);
          }}
          className="p-2 text-sm border border-gray-300 rounded-md"
        >
          <option value="all">All loans</option>
          {loanOptions.map((opt) => (
            <option key={opt.id} value={String(opt.id)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* entries list */}
      <div className="flex-grow overflow-y-auto border rounded-md p-3 space-y-2 max-h-[400px]">
        {!availableLoanIds.length ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
            <p className="text-sm text-gray-500">No loan found for this employee.</p>
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Go to Loan Management
            </button>
          </div>
        ) : displayedEntries.length > 0 ? (
          <>
            {displayedEntries.map((entry, index) => (
              <div
                key={entry.journal_id}
                className="flex flex-col items-start justify-between gap-3 p-3 transition border border-gray-200 rounded-md sm:flex-row sm:items-center bg-gray-50 hover:shadow-sm"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-400">#{index + 1}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                        entry.entry_type === "debit" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      }`}
                    >
                      {entry.entry_type}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">₱{parseFloat(entry.amount).toFixed(2)}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {entry.loan_id ? `Loan #${entry.loan_id}` : ""}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 break-words whitespace-pre-wrap">{entry.description || "-"}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 sm:flex-col sm:items-end sm:text-right">
                  <span>
                    {entry.entry_date
                      ? new Date(entry.entry_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                      : "N/A"}
                  </span>
                  <button
                    className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                    onClick={() => handleDelete(entry.journal_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {/* Show More / Less controls */}
            {journalEntries.length > visibleCount && (
              <div className="flex justify-center mt-3">
                <button onClick={() => setVisibleCount((prev) => prev + 5)} className="px-4 py-2 text-sm text-blue-600 rounded-md bg-blue-50 hover:bg-blue-100">
                  Show More
                </button>
              </div>
            )}
            {visibleCount > 5 && (
              <div className="flex justify-center mt-2">
                <button onClick={() => setVisibleCount(5)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
                  Show Less
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-sm text-center text-gray-500">No journal entries found.</div>
        )}
      </div>

      {/* Loan management modal (unchanged) */}
      <ModalWrapper isOpen={showLoanModal} onClose={() => setShowLoanModal(false)}>
        <LoanPage />
      </ModalWrapper>
    </div>
  );
};

export default LoanJournalEntriesTable;




// //LoanJournalEntriesTable for payroll
// import React, { useEffect, useState } from "react";
// import useLoanJournalAPI from "../../components/loan/loan_hooks/useLoanJournalAPI";
// import useLoanAPI from "../../components/loan/loan_hooks/useLoanAPI";
// import ModalWrapper from "../../utils/ModalWrapper";
// import LoanPage from "../../components/loan/LoanPage";

// const LoanJournalEntriesTable = ({ loan_id, employee_id, payroll, onUpdateLoanDeduction  }) => {
//   const {
//     journalEntries,
//     fetchJournalEntries,
//     createJournalEntry,
//     deleteJournalEntry,
//   } = useLoanJournalAPI();

//   const { fetchLoans } = useLoanAPI();
//   const [showLoanModal, setShowLoanModal] = useState(false);

//   const [newEntry, setNewEntry] = useState({
//     loan_id: loan_id || "",
//     employee_id: employee_id || "",
//     entry_type: "credit",
//     amount: "",
//     description: "",
//     entry_date: "",   

//   });

//   const [visibleCount, setVisibleCount] = useState(5);


// useEffect(() => {
//   if (onUpdateLoanDeduction) {
//     const totalCredits = journalEntries
//       .filter((e) => e.entry_type === "credit")
//       .filter((e) => {
//         const entryDate = new Date(e.entry_date);
//         const from = new Date(payroll.date_from);
//         const until = new Date(payroll.date_until);
//         return entryDate >= from && entryDate <= until;
//       })
//       .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

//     onUpdateLoanDeduction(totalCredits);
//   }
// }, [journalEntries, onUpdateLoanDeduction, payroll]);

// // --- Total Credit Display ---
// const totalCredit = journalEntries
//   .filter((e) => e.entry_type === "credit")
//   .filter((e) => {
//     const entryDate = new Date(e.entry_date);
//     const from = new Date(payroll.date_from);
//     const until = new Date(payroll.date_until);
//     return entryDate >= from && entryDate <= until;
//   })
//   .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

// // Helper for PHP formatting
// const formatPeso = (val) =>
//   new Intl.NumberFormat("en-PH", {
//     style: "currency",
//     currency: "PHP",
//     minimumFractionDigits: 2,
//   }).format(val);


//   useEffect(() => {
//     setNewEntry((prev) => ({
//       ...prev,
//       loan_id: loan_id || "",
//       employee_id: employee_id || "",
//     }));
//   }, [loan_id, employee_id]);

//   useEffect(() => {
//     if (loan_id) {
//       fetchJournalEntries(loan_id);
//     }
//   }, [loan_id]);

//   // 🔑 Sync deduction whenever journalEntries change
// // ✅ always report a number (even 0)
// useEffect(() => {
//   if (onUpdateLoanDeduction) {
//     const totalCredits = journalEntries
//       .filter((e) => e.entry_type === "credit")
//       // ✅ Only include credits inside this payroll cutoff
//       .filter((e) => {
//         const entryDate = new Date(e.entry_date);
//         const from = new Date(payroll.date_from);
//         const until = new Date(payroll.date_until);
//         return entryDate >= from && entryDate <= until;
//       })
//       .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

//     onUpdateLoanDeduction(totalCredits);
//   }
// }, [journalEntries, onUpdateLoanDeduction, payroll]);



//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setNewEntry((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleAddEntry = async () => {
//     if (!newEntry.amount) return alert("Amount required");
//     if (!employee_id) return alert("Missing employee_id");
//     if (!newEntry.entry_date) return alert("Entry date required");

//     const payload = {
//       ...newEntry,
//       loan_id,
//       employee_id,
//     };

//     const response = await createJournalEntry(payload);

//     if (response.success) {
//       await fetchJournalEntries(loan_id);
//       fetchLoans();
//       setNewEntry((prev) => ({
//         ...prev,
//         amount: "",
//         description: "",
//         entry_type: "credit",
//       }));
//     } else {
//       alert("Failed to save: " + (response.message || "Unknown error"));
//     }
//   };

//   const handleDelete = async (journal_id) => {
//     const confirm = window.confirm("Delete this journal entry?");
//     if (confirm) {
//       await deleteJournalEntry(journal_id);
//       await fetchJournalEntries(loan_id);
//       fetchLoans();
//     }
//   };

//   // ✅ entries to render based on visibleCount
//   const displayedEntries = journalEntries.slice(0, visibleCount);

//   return (
//     <div className="flex flex-col w-full h-full p-4 mt-4 text-sm bg-white border border-gray-200 rounded-md shadow-md">
//       <h3 className="mb-3 text-base font-semibold text-gray-800">
//         Loan Journal Entries
//       </h3>

//       {/* --- Entry Form --- */}
//       <div className="grid grid-cols-1 gap-2 mb-4 sm:grid-cols-5">
//         <select
//           name="entry_type"
//           value={newEntry.entry_type}
//           onChange={handleInputChange}
//           disabled={!loan_id}
//           className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
//         >
//           <option value="debit">Debit - loan release</option>
//           <option value="credit">Credit - loan payment</option>
//         </select>

//         <input
//           type="number"
//           name="amount"
//           value={newEntry.amount}
//           onChange={handleInputChange}
//           disabled={!loan_id}
//           placeholder="Amount"
//           className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
//         />
//         <input
//           type="date"
//           name="entry_date"
//           value={newEntry.entry_date}
//           onChange={handleInputChange}
//           disabled={!loan_id}
//           className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
//         />



//         <input
//           type="text"
//           name="description"
//           value={newEntry.description}
//           onChange={handleInputChange}
//           disabled={!loan_id}
//           placeholder="Remarks"
//           className="p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
//         />

//         <button
//           onClick={handleAddEntry}
//           disabled={!loan_id}
//           className="px-4 py-2 text-sm text-white transition bg-blue-600 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700"
//         >
//           + Add Entry
//         </button>
//       </div>

//       <div className="flex justify-between p-2 mb-2 text-sm font-semibold text-gray-800 bg-gray-100 rounded-md">
//         <span>Total Credits (This Cutoff):</span>
//         <span className="text-red-600">{formatPeso(totalCredit)}</span>
//       </div>

//       {/* --- Journal Entries List --- */}
//       <div className="flex-grow overflow-y-auto border rounded-md p-3 space-y-2 max-h-[400px]">
//         {!loan_id ? (
//           <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
//             <p className="text-sm text-gray-500">No loan found for this employee.</p>
//             <button
//               onClick={() => setShowLoanModal(true)}
//               className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
//             >
//               Go to Loan Management
//             </button>
//           </div>
//         ) : displayedEntries.length > 0 ? (
//           <>
//             {displayedEntries.map((entry, index) => (
//               <div
//                 key={entry.journal_id}
//                 className="flex flex-col items-start justify-between gap-3 p-3 transition border border-gray-200 rounded-md sm:flex-row sm:items-center bg-gray-50 hover:shadow-sm"
//               >
//                 <div className="flex-1">
//                   <div className="flex flex-wrap items-center gap-2 mb-1">
//                     <span className="text-xs font-medium text-gray-400">
//                       #{index + 1}
//                     </span>
//                     <span
//                       className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
//                         entry.entry_type === "debit"
//                           ? "bg-red-100 text-red-600"
//                           : "bg-green-100 text-green-600"
//                       }`}
//                     >
//                       {entry.entry_type}
//                     </span>
//                     <span className="text-sm font-semibold text-gray-700">
//                       ₱{parseFloat(entry.amount).toFixed(2)}
//                     </span>
//                   </div>
//                   <p className="text-sm text-gray-600 break-words whitespace-pre-wrap">
//                     {entry.description || "-"}
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-3 text-xs text-gray-500 sm:flex-col sm:items-end sm:text-right">
//                 <span>
//                   {entry.entry_date
//                     ? new Date(entry.entry_date).toLocaleDateString("en-US", {
//                         year: "numeric",
//                         month: "long",
//                         day: "numeric",
//                       })
//                     : "N/A"}
//                 </span>
//                   <button
//                     className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
//                     onClick={() => handleDelete(entry.journal_id)}
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             ))}

//             {/* ✅ Show More / Show Less button */}
//             {journalEntries.length > visibleCount && (
//               <div className="flex justify-center mt-3">
//                 <button
//                   onClick={() => setVisibleCount((prev) => prev + 5)}
//                   className="px-4 py-2 text-sm text-blue-600 rounded-md bg-blue-50 hover:bg-blue-100"
//                 >
//                   Show More
//                 </button>
//               </div>
//             )}
//             {visibleCount > 5 && (
//               <div className="flex justify-center mt-2">
//                 <button
//                   onClick={() => setVisibleCount(5)}
//                   className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
//                 >
//                   Show Less
//                 </button>
//               </div>
//             )}
//           </>
//         ) : (
//           <div className="py-6 text-sm text-center text-gray-500">
//             No journal entries found.
//           </div>
//         )}
//       </div>
//       <ModalWrapper isOpen={showLoanModal} onClose={() => setShowLoanModal(false)}>
//         <LoanPage />
//       </ModalWrapper>
//     </div>
//   );
// };

// export default LoanJournalEntriesTable;


