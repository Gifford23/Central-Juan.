// 📁 loan_components/Loan/JournalEntryModal.jsx
import React from "react";
import LoanJournalEntriesTable from "./LoanJournalEntriesTable";
import { X } from "lucide-react";

const JournalEntryModal = ({ isOpen, onClose, loan, loans = [], employee = null }) => {
  // if modal closed or no context, don't render
  if (!isOpen) return null;

  // Prefer array if provided; otherwise create array from single loan prop
  const initialLoans = Array.isArray(loans) && loans.length ? loans : (loan ? [loan] : []);
  const loan_ids = initialLoans.map(l => l.loan_id).filter(Boolean);

  // derive employee_id - prefer explicit employee prop, fallback to first loan
  const employee_id = (employee && employee.employee_id) || (initialLoans[0] && initialLoans[0].employee_id) || null;
  const employee_name = (employee && employee.employee_name) || (initialLoans[0] && initialLoans[0].employee_name) || '';

  // Nothing to show
  if (!initialLoans.length && !employee_id) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="relative w-full max-w-3xl p-4 bg-white rounded-lg shadow-lg">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute p-1 text-red-500 rounded top-2 right-2 hover:bg-gray-200"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="mb-2 text-lg font-semibold text-gray-700">
          Journal Entries for:{" "}
          <span className="text-blue-600">{employee_name || 'Employee'}</span>
        </h2>

        <LoanJournalEntriesTable
          initialLoans={initialLoans}
          loan_ids={loan_ids}
          employee_id={employee_id}
          showLoanSelector={true}
          onUpdateLoanDeduction={() => {}}
        />
      </div>
    </div>
  );
};

export default JournalEntryModal;
  