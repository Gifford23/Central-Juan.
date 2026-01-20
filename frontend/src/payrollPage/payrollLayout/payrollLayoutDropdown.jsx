import React from "react";
import TableAmPm from "../../components/DTRattenance/DTRComponent/displayDTR";
import DeductionTemplate from "../payrollComponents/deductionTemplate";
import PayrollJournalEntry from "../payrollComponents/payrollJournalEntry";
import PayrollSettings from "../payrollComponents/payrollSettings";
import PayrollEmployeeDetail from "../payrollComponents/payrollEmployeeDetail";
import PayrollSummary from "../payrollComponents/PayrollSummary";
import {
  saveLoanDeductionAPI,
  syncLoanDeductionForPayroll,
  updateContributionTypeAPI,
} from "../payrollApi/payrollapi";
import Swal from "sweetalert2";
import ContributionTypeSelector from "../payrollComponents/ContributionTypeSelector";
import LoanDetails from "../payrollComponents/LoanDetails";

export default function PayrollLayoutDropdown({
  selectedPayroll,
  formatDate,
  onDeductionUpdate, // ✅ receive callback from parent
}) {
  const dtrData =
    selectedPayroll?.attendance_records?.map((item) => ({
      date: item.attendance_date,
      am_in: item.time_in_morning,
      am_out: item.time_out_morning,
      pm_in: item.time_in_afternoon,
      pm_out: item.time_out_afternoon,
      total_credit: item.days_credited,
      total_rendered_hours: item.total_rendered_hours
    })) || [];

  return (
    <div className="flex flex-col w-full gap-4 p-2 rounded-md md:flex-row bg-amber-100">
      {/* DTR & Summary Section */}
      <div className="flex flex-col h-full p-3 bg-white rounded-lg shadow md:flex-1">
        <header className="mb-2 text-sm font-semibold text-gray-700">DTR</header>
        <main className="overflow-y-auto max-h-[300px] md:max-h-[500px]">
          <TableAmPm
            dtrData={dtrData}
            dateFrom={selectedPayroll.date_from}
            dateUntil={selectedPayroll.date_until}
          />
        </main>
        <footer className="mt-3">
          <PayrollSummary payroll={selectedPayroll} formatDate={formatDate} />
        </footer>
      </div>

      {/* Deduction & Journal Section */}
      <div className="flex flex-col gap-4 p-3 bg-white rounded-lg shadow md:flex-1">
        <header className="text-sm font-semibold text-gray-700">Deduction</header>

        {/* ✅ Contribution Type Selector */}
        <ContributionTypeSelector
          selectedPayroll={selectedPayroll}
          onUpdateContributionType={async ({
            payroll_id,
            contribution_deduction_type,
          }) => {
            try {
              Swal.fire({
                title: "Updating...",
                text: "Please wait while updating contribution deduction type.",
                allowOutsideClick: false,
                didOpen: () => {
                  Swal.showLoading();
                },
              });

              const res = await updateContributionTypeAPI({
                payroll_id,
                contribution_deduction_type,
              });

              if (res.success) {
                Swal.fire(
                  "✅ Success!",
                  "Contribution deduction type updated successfully.",
                  "success"
                );
              } else {
                Swal.fire(
                  "⚠️ Failed!",
                  res.message || "Update failed.",
                  "warning"
                );
              }

              return res;
            } catch (err) {
              console.error("Error updating contribution deduction type:", err);
              Swal.fire(
                "❌ Error!",
                "Could not update contribution type.",
                "error"
              );
              return { success: false, message: "Exception thrown" };
            }
          }}
        />

        {/* ✅ Deduction Template hooked with onDeductionUpdate */}
        <section className="w-full">
          <DeductionTemplate
            payroll={selectedPayroll}
            onSaved={(newDeduction) => {
              if (onDeductionUpdate) {
                onDeductionUpdate(newDeduction); // 🔥 updates PayrollList immediately
              }
            }}
          />
        </section>

        {/* Loan details (optional) */}
        {/* <section className="w-full">
          <LoanDetails localLoans={selectedPayroll.loans || []} />
        </section> */}

        {/* Journal entry (optional) */}
        {/* <section className="flex-1 w-full h-[50vh]">
          <PayrollJournalEntry
            employee_id={selectedPayroll.employee_id}
            loan_id={selectedPayroll.loans?.[0]?.loan_id || null}
          />
        </section> */}
      </div>
    </div>
  );
}
