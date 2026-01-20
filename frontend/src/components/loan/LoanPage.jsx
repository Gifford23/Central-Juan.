// LoanPage.jsx
import React, { useEffect, useState } from "react";
import LoanTable from "./loan_components/LoanTable";
import LoanFormModal from "./loan_components/LoanFormModal";
import LoanHeader from "./loan_components/LoanHeader";
import useLoanAPI from "./loan_hooks/useLoanAPI";
import LoanJournalEntriesTable from "./LoanJournalEntries/LoanJournalEntriesTable";

const LoanPage = () => {
  const { loans, fetchLoans, deleteLoan, addLoan, updateLoan } = useLoanAPI();
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  // journalContext: { employee, loans }
  const [journalContext, setJournalContext] = useState(null);
  const [showJournalEntries, setShowJournalEntries] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchLoans().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // deep-clone helper to avoid passing references
  const cloneLoan = (loan) => {
    try {
      return loan ? JSON.parse(JSON.stringify(loan)) : null;
    } catch {
      return loan ? { ...loan } : null;
    }
  };

  const handleView = (loan) => {
    setSelectedLoan(cloneLoan(loan));
    setShowFormModal(true);
  };

  const handleEdit = (loan) => {
    setSelectedLoan(cloneLoan(loan));
    setShowFormModal(true);
  };

  const handleDelete = async (loan) => {
    const confirm = window.confirm("Are you sure you want to delete this loan?");
    if (confirm) {
      setLoading(true);
      try {
        await deleteLoan(loan.loan_id);
        await fetchLoans();
      } catch (err) {
        console.error("LoanPage: delete error", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddLoan = () => {
    setSelectedLoan(null);
    setShowFormModal(true);
  };

  const handleLoanSubmit = async (loanData) => {
    // DEBUG: log what the modal produced
    console.log("LoanPage: received loanData from modal ->", loanData);

    setLoading(true);
    try {
      let resp;
      if (loanData.loan_id) {
        resp = await updateLoan(loanData);
        console.log("LoanPage: updateLoan response ->", resp);
      } else {
        resp = await addLoan(loanData);
        console.log("LoanPage: addLoan response ->", resp);
      }
      setShowFormModal(false);
      setSelectedLoan(null);
      await fetchLoans();
    } catch (err) {
      console.error("LoanPage: submit error", err);
    } finally {
      setLoading(false);
    }
  };

  // receives payload from LoanTable: { employee, loans }
  const handleOpenJournal = (payload) => {
    setJournalContext(payload);
    setShowJournalEntries(true);
  };

  const handleCloseJournal = () => {
    setShowJournalEntries(false);
    setJournalContext(null);
  };

  return (
    <div className="">
      <LoanHeader onAddLoan={handleAddLoan} onViewJournalEntries={() => setShowJournalEntries(true)} />

      {/* ALWAYS render LoanTable and let it handle its own loading UI via the `loading` prop */}
      {!showJournalEntries && (
        <LoanTable
          loans={loans}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onOpenJournal={handleOpenJournal}
        />
      )}

      {/* Render LoanJournalEntriesTable as MUI modal — no separate JournalEntryModal file */}
      <LoanJournalEntriesTable
        asModal
        open={showJournalEntries}
        onClose={handleCloseJournal}
        initialLoans={Array.isArray(journalContext?.loans) ? journalContext.loans : []}
        loan_ids={
          Array.isArray(journalContext?.loans)
            ? journalContext.loans.map((l) => l.loan_id).filter(Boolean)
            : journalContext?.loan_id
            ? [journalContext.loan_id]
            : []
        }
        employee_id={
          (journalContext?.employee && journalContext.employee.employee_id) ||
          journalContext?.employee_id ||
          (Array.isArray(journalContext?.loans) && journalContext.loans[0]?.employee_id) ||
          null
        }
        showLoanSelector={true}
        onUpdateLoanDeduction={(total) => {
          console.log("Loan deduction updated total:", total);
        }}
      />

      <LoanFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedLoan(null);
        }}
        onSubmit={handleLoanSubmit}
        selectedLoan={selectedLoan}
      />
    </div>
  );
};

export default LoanPage;



// // LoanPage.jsx
// import React, { useEffect, useState } from "react";
// import LoanTable from "./loan_components/LoanTable";
// import LoanFormModal from "./loan_components/LoanFormModal";
// import LoanHeader from "./loan_components/LoanHeader";
// import useLoanAPI from "./loan_hooks/useLoanAPI";
// import LoanJournalEntriesTable from "./LoanJournalEntries/LoanJournalEntriesTable";

// const LoanPage = () => {
//   const { loans, fetchLoans, deleteLoan, addLoan, updateLoan } = useLoanAPI();
//   const [selectedLoan, setSelectedLoan] = useState(null);
//   const [showFormModal, setShowFormModal] = useState(false);

//   // journalContext: { employee, loans }
//   const [journalContext, setJournalContext] = useState(null);
//   const [showJournalEntries, setShowJournalEntries] = useState(false);

//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     setLoading(true);
//     fetchLoans().finally(() => setLoading(false));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const handleView = (loan) => {
//     setSelectedLoan(loan);
//     setShowFormModal(true);
//   };

//   const handleEdit = (loan) => {
//     setSelectedLoan(loan);
//     setShowFormModal(true);
//   };

//   const handleDelete = async (loan) => {
//     const confirm = window.confirm("Are you sure you want to delete this loan?");
//     if (confirm) {
//       setLoading(true);
//       await deleteLoan(loan.loan_id);
//       await fetchLoans();
//       setLoading(false);
//     }
//   };

//   const handleAddLoan = () => {
//     setSelectedLoan(null);
//     setShowFormModal(true);
//   };

//   const handleLoanSubmit = async (loanData) => {
//     setLoading(true);
//     if (loanData.loan_id) await updateLoan(loanData);
//     else await addLoan(loanData);
//     setShowFormModal(false);
//     setSelectedLoan(null);
//     await fetchLoans();
//     setLoading(false);
//   };

//   // receives payload from LoanTable: { employee, loans }
//   const handleOpenJournal = (payload) => {
//     setJournalContext(payload);
//     setShowJournalEntries(true);
//   };

//   const handleCloseJournal = () => {
//     setShowJournalEntries(false);
//     setJournalContext(null);
//   };

//   return (
//     <div className="p-4">
//       <LoanHeader onAddLoan={handleAddLoan} onViewJournalEntries={() => setShowJournalEntries(true)} />

//       {loading ? (
//         <div className="flex items-center justify-center p-4 text-blue-500">
//           <span className="mr-2 animate-spin">🔄</span> Loading loans...
//         </div>
//       ) : (
//         <>
//           {!showJournalEntries && (
//             <LoanTable
//               loans={loans}
//               onView={handleView}
//               onEdit={handleEdit}
//               onDelete={handleDelete}
//               onOpenJournal={handleOpenJournal}
//             />
//           )}

//           {/* Render LoanJournalEntriesTable as MUI modal — no separate JournalEntryModal file */}
//           <LoanJournalEntriesTable
//             asModal
//             open={showJournalEntries}
//             onClose={handleCloseJournal}
//             initialLoans={Array.isArray(journalContext?.loans) ? journalContext.loans : []}
//             loan_ids={Array.isArray(journalContext?.loans) ? journalContext.loans.map(l => l.loan_id).filter(Boolean) : journalContext?.loan_id ? [journalContext.loan_id] : []}
//             employee_id={
//               (journalContext?.employee && journalContext.employee.employee_id) ||
//               journalContext?.employee_id ||
//               (Array.isArray(journalContext?.loans) && journalContext.loans[0]?.employee_id) ||
//               null
//             }
//             showLoanSelector={true}
//             onUpdateLoanDeduction={(total) => {
//               console.log("Loan deduction updated total:", total);
//             }}
//           />
//         </>
//       )}

//       <LoanFormModal
//         isOpen={showFormModal}
//         onClose={() => { setShowFormModal(false); setSelectedLoan(null); }}
//         onSubmit={handleLoanSubmit}
//         selectedLoan={selectedLoan}
//       />
//     </div>
//   );
// };

// export default LoanPage;




// import React, { useEffect, useState } from "react";
// import LoanTable from "./loan_components/LoanTable";
// import LoanFormModal from "./loan_components/LoanFormModal";
// import LoanHeader from "./loan_components/LoanHeader";
// import useLoanAPI from "./loan_hooks/useLoanAPI";
// import LoanJournalEntriesTable from "./LoanJournalEntries/LoanJournalEntriesTable";
// import JournalEntryModal from "./LoanJournalEntries/JournalEntryModal";

// const LoanPage = () => {
//   const { loans, fetchLoans, deleteLoan, addLoan, updateLoan } = useLoanAPI();
//   const [selectedLoan, setSelectedLoan] = useState(null);
//   const [showFormModal, setShowFormModal] = useState(false);
//   const [showJournalEntries, setShowJournalEntries] = useState(false);
//   const [selectedJournalLoan, setSelectedJournalLoan] = useState(null);
//   const [loading, setLoading] = useState(true); // ✅ New loading state

//   useEffect(() => {
//     if (selectedJournalLoan) {
//       console.log("🟡 Selected Loan for Journal:", selectedJournalLoan);
//     }
//   }, [selectedJournalLoan]);

//   useEffect(() => {
//     const loadLoans = async () => {
//       setLoading(true); // ✅ start loading
//       await fetchLoans();
//       setLoading(false); // ✅ end loading
//     };

//     loadLoans();
//   }, []);

//   const handleView = (loan) => {
//     setSelectedLoan(loan);
//     setShowFormModal(true);
//   };

//   const handleEdit = (loan) => {
//     setSelectedLoan(loan);
//     setShowFormModal(true);
//   };

//   const handleDelete = async (loan) => {
//     const confirm = window.confirm("Are you sure you want to delete this loan?");
//     if (confirm) {
//       setLoading(true);
//       await deleteLoan(loan.loan_id);
//       await fetchLoans();
//       setLoading(false);
//     }
//   };

//   const handleAddLoan = () => {
//     setSelectedLoan(null);
//     setShowFormModal(true);
//   };

//   const handleLoanSubmit = async (loanData) => {
//     setLoading(true);
//     if (loanData.loan_id) {
//       await updateLoan(loanData.loan_id, loanData);
//     } else {
//       await addLoan(loanData);
//     }
//     setShowFormModal(false);
//     setSelectedLoan(null);
//     await fetchLoans();
//     setLoading(false);
//   };

//   const handleOpenJournal = (loan) => {
//     setSelectedJournalLoan(loan);
//     setShowJournalEntries(true);
//   };

//   return (
//     <div className="p-4">
//       <LoanHeader
//         onAddLoan={handleAddLoan}
//         onViewJournalEntries={() => setShowJournalEntries(true)}
//       />

//       {loading ? (
//         <div className="flex items-center justify-center p-4 text-blue-500">
//           <span className="mr-2 animate-spin">🔄</span> Loading loans...
//         </div>
//       ) : (
//         <>
//           {!showJournalEntries && (
//             <LoanTable
//               loans={loans}
//               onView={handleView}
//               onEdit={handleEdit}
//               onDelete={handleDelete}
//               onOpenJournal={handleOpenJournal}
//             />
//           )}

//           {showJournalEntries && (
//             <div className="mt-4">
//               <button
//                 className="px-4 py-2 mb-3 text-sm text-white bg-red-500 rounded"
//                 onClick={() => setShowJournalEntries(false)}
//               >
//                 ❌ Close Journal Entries
//               </button>

//               {selectedJournalLoan ? (
//                 <LoanJournalEntriesTable
//                   loan_id={selectedJournalLoan.loan_id}
//                   employee_id={selectedJournalLoan.employee_id}
//                 />
//               ) : (
//                 <p className="text-sm text-gray-600">
//                   Please select a loan first to view its journal entries.
//                 </p>
//               )}
//             </div>
//           )}
//         </>
//       )}

//       <LoanFormModal
//         isOpen={showFormModal}
//         onClose={() => {
//           setShowFormModal(false);
//           setSelectedLoan(null);
//         }}
//         onSubmit={handleLoanSubmit}
//         selectedLoan={selectedLoan}
//       />

//       <JournalEntryModal
//         isOpen={showJournalEntries}
//         onClose={() => {
//           setShowJournalEntries(false);
//           setSelectedJournalLoan(null);
//         }}
//         loan={selectedJournalLoan}
//       />
//     </div>
//   );
// };

// export default LoanPage;
