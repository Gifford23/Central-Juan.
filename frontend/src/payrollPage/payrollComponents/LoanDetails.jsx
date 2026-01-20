import React from "react";
import { Typography } from "@mui/material";

function LoanDetails({ localLoans }) {
  // If there’s at least one active loan, grab the first for quick display
  const firstLoan = localLoans.length > 0 ? localLoans[0] : null;

  return (
    <div className="p-3 bg-gray-100 rounded-lg shadow ">
      <div className="flex flex-col w-full">
        <Typography className="text-sm font-semibold">
          Loan Info & Manual Deduction
        </Typography>

        {firstLoan && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-[12px] text-gray-600">
            <span className="whitespace-nowrap">
              <strong>Loan Amount:</strong> ₱{firstLoan.loan_amount}
            </span>
            <span className="whitespace-nowrap">
              <strong>Balance:</strong> ₱{firstLoan.balance}
            </span>
            <span className="whitespace-nowrap">
              <strong>Schedule:</strong> {firstLoan.deduction_schedule}
            </span>
            <span className="whitespace-nowrap">
              <strong>Term:</strong>{" "}
              {firstLoan.final_loan_deduction || firstLoan.payable_per_term}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoanDetails;




// import React, { useState } from "react";
// import {
//   Accordion,
//   AccordionSummary,
//   AccordionDetails,
//   Typography,
// } from "@mui/material";
// import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// function LoanDetails({ localLoans }) {
//   const [expanded, setExpanded] = useState(false);

//   // If there’s at least one active loan, grab the first for quick display
//   const firstLoan = localLoans.length > 0 ? localLoans[0] : null;

//   return (
//     <div className="w-full">
//       <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
//         <AccordionSummary
//           expandIcon={<ExpandMoreIcon />}
//           className="flex items-center justify-between bg-gray-100"
//         >
//           <div className="flex flex-col w-full sm:flex-col sm:items-center sm:justify-between">
//             <Typography className="text-sm font-semibold">
//               Loan Info & Manual Deduction
//             </Typography>
//                 {firstLoan && (
//                 <div className="flex flex-col sm:flex-row sm:gap-6 mt-1 sm:mt-0 text-[12px] text-gray-600">
//                     <span>
//                     <strong>Balance:</strong> ₱{firstLoan.balance}
//                     </span>
//                     <span>
//                     <strong>Schedule:</strong> {firstLoan.deduction_schedule}
//                     </span>
//                     <span>
//                     <strong>Term:</strong>{" "}
//                     {firstLoan.final_loan_deduction || firstLoan.payable_per_term}
//                     </span>
//                 </div>
//                 )}
//           </div>
//         </AccordionSummary>

//         {/* <AccordionDetails>
//           {localLoans.length === 0 ? (
//             <Typography
//               variant="body2"
//               color="text.secondary"
//               className="text-[13px]"
//             >
//               No active loan found for this employee.
//             </Typography>
//           ) : (
//             <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//               {localLoans.map((loan, idx) => (
//                 <div
//                   key={idx}
//                   className="p-3 w-full text-[13px] bg-white border rounded-lg shadow-sm"
//                 >
//                   <p className="mb-1">
//                     <strong>Schedule:</strong> {loan.deduction_schedule}
//                   </p>
//                   <p className="mb-1">
//                     <strong>Pay per term:</strong> ₱
//                     {loan.final_loan_deduction || loan.payable_per_term}
//                   </p>
//                   <p className="mb-1">
//                     <strong>Loan Amount:</strong> ₱{loan.loan_amount}
//                   </p>
//                   <p className="mb-1">
//                     <strong>Balance:</strong> ₱{loan.balance}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           )}
//         </AccordionDetails> */}
//       </Accordion>
//     </div>
//   );
// }

// export default LoanDetails;