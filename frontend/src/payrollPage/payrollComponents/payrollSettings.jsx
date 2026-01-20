import React, { useState, useEffect } from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Swal from 'sweetalert2';

function PayrollSettings({ selectedPayroll, onSaveDeduction, onUpdateContributionType }) {
  const [deductionSchedule, setDeductionSchedule] = useState('');
  const [loanDeductionAmount, setLoanDeductionAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [contributionType, setContributionType] = useState('');

  // 🔑 Local state copy of loans so we can update UI immediately
  const [localLoans, setLocalLoans] = useState([]);

  useEffect(() => {
    setContributionType(selectedPayroll?.contribution_deduction_type || '');
    const activeLoans = selectedPayroll?.loans || [];
    setLocalLoans(activeLoans);

    if (activeLoans.length > 0) {
      const loan = activeLoans[0]; // assuming only 1 active loan
      setDeductionSchedule(loan.deduction_schedule);
      setLoanDeductionAmount(loan.final_loan_deduction || loan.payable_per_term);
    }
  }, [selectedPayroll]);

  const handleScheduleChange = (event) => {
    setDeductionSchedule(event.target.value);
  };

  const handleDeductionChange = (e) => {
    setLoanDeductionAmount(e.target.value);
  };

const handleSave = async () => {
  if (onSaveDeduction && loanDeductionAmount && deductionSchedule !== '') {
    setIsSaving(true);

    const res = await onSaveDeduction({
      deductionSchedule,
      loanDeductionAmount: parseFloat(loanDeductionAmount),
      loanId: localLoans[0]?.loan_id,
    });

  if (res?.success && res.loan) {
      // 🔥 Replace the old loan with the updated one
      setLocalLoans((prevLoans) =>
        prevLoans.map((loan) =>
          loan.loan_id === res.loan.loan_id ? res.loan : loan
        )
      );

      // keep input field in sync too
      setLoanDeductionAmount(res.loan.final_loan_deduction);
      setDeductionSchedule(res.loan.deduction_schedule);

      Swal.fire("✅ Saved", "Loan deduction updated successfully.", "success");
    } else {
      Swal.fire("⚠️ Failed", res?.message || "Could not update deduction.", "warning");
    }

       setIsSaving(false);
  }
};
  const handleUpdateContributionType = async () => {
    if (!onUpdateContributionType) {
      console.warn("onUpdateContributionType not provided");
      return;
    }
    if (!contributionType) {
      Swal.fire("⚠️ Missing", "Select a contribution deduction type.", "warning");
      return;
    }

    setIsUpdating(true);
    console.log("Updating contribution deduction type:", contributionType, "for payroll_id:", selectedPayroll?.payroll_id);
    try {
      Swal.fire({
        title: "Updating...",
        text: "Please wait while updating contribution deduction type.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await onUpdateContributionType({
        payroll_id: selectedPayroll.payroll_id,
        contribution_deduction_type: contributionType,
      });

      if (response?.success) {
        Swal.fire("✅ Success!", "Contribution deduction type updated successfully.", "success");
      } else {
        Swal.fire("⚠️ Failed!", response?.message || "Unknown error.", "warning");
      }
    } catch (error) {
      console.error("Error updating contribution deduction type:", error);
      Swal.fire("❌ Error!", "Could not update contribution type.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col p-4 bg-white min-h-[350px]">
      <Typography variant="h6" gutterBottom style={{ fontSize: '13px' }}>
        Loan Info & Manual Deduction
      </Typography>

      {localLoans.length === 0 ? (
        <Typography variant="body2" color="text.secondary" style={{ fontSize: '13px' }}>
          No active loan found for this employee.
        </Typography>
      ) : (
        localLoans.map((loan, idx) => (
          <div
            key={idx}
            className="p-2 mb-3 text-[13px] bg-gray-100 rounded shadow-sm leading-tight"
          >
            <p><strong>Schedule:</strong> {loan.deduction_schedule}</p>
            <p><strong>Pay per term:</strong> ₱{loan.final_loan_deduction || loan.payable_per_term}</p>
            <p><strong>Loan Amount:</strong> ₱{loan.loan_amount}</p>
            <p><strong>Balance:</strong> ₱{loan.balance}</p>

          </div>
        ))
      )}

      <Divider className="my-2" />

      <div className="mb-4">
        <p className="mb-1 font-medium text-[13px]">Set Loan Deduction (Manual)</p>
        <TextField
          fullWidth
          type="number"
          size="small"
          value={loanDeductionAmount}
          onChange={handleDeductionChange}
          placeholder="Enter deduction amount"
          inputProps={{ min: 0 }}
          label="Final Loan Deduction"
          InputLabelProps={{ style: { fontSize: '13px' } }}
          InputProps={{ style: { fontSize: '13px' } }}
        />
      </div>

      <Divider className="my-2" />

      <Button
        className="z-0"
        variant="contained"
        color="primary"
        onClick={handleSave}
        disabled={isSaving}
        size="small"
        style={{ fontSize: '11px', padding: '6px 12px', minWidth: '130px' }}
      >
        {isSaving ? (
          <>
            <CircularProgress size={14} color="inherit" className="mr-2" />
            Saving...
          </>
        ) : (
          'Save Deduction'
        )}
      </Button>

  
      <div className="flex flex-col mb-4 " label="Contribution-deduction-type"> 
        <FormControl fullWidth className="mb-4" size="small">
          <Select
            value={contributionType}
            onChange={(e) => setContributionType(e.target.value)}
            label="Contribution Deduction Type"
            style={{ fontSize: '11px' }}
          >
            <MenuItem value="monthly" style={{ fontSize: '11px' }}>Monthly</MenuItem>
            <MenuItem value="semi-monthly" style={{ fontSize: '11px' }}>Semi-Monthly</MenuItem>
          </Select>
        </FormControl>

        <Button
          className="z-0"
          variant="contained"
          color="primary"
          onClick={handleUpdateContributionType}
          disabled={isUpdating}
          size="small"
          style={{ fontSize: '11px', padding: '6px 12px', minWidth: '130px' }}
        >
          {isUpdating ? (
            <>
              <CircularProgress size={14} color="inherit" className="mr-2" />
              Updating...
            </>
          ) : (
            'Update Contribution Type'
          )}
        </Button>
      </div>
    </div>
  );
}

export default PayrollSettings;




// import React, { useState, useEffect } from 'react';
// import InputLabel from '@mui/material/InputLabel';
// import MenuItem from '@mui/material/MenuItem';
// import FormControl from '@mui/material/FormControl';
// import Select from '@mui/material/Select';
// import Button from '@mui/material/Button';
// import TextField from '@mui/material/TextField';
// import Typography from '@mui/material/Typography';
// import Divider from '@mui/material/Divider';
// import CircularProgress from '@mui/material/CircularProgress';

// function PayrollSettings({ selectedPayroll, onSaveDeduction }) {
//   const [deductionSchedule, setDeductionSchedule] = useState('');
//   const [loanDeductionAmount, setLoanDeductionAmount] = useState('');
//   const [isSaving, setIsSaving] = useState(false);

//   const activeLoans = selectedPayroll?.loans || [];

//   useEffect(() => {
//     if (activeLoans.length > 0) {
//       const loan = activeLoans[0]; // Assuming only 1 active loan for now
//       setDeductionSchedule(loan.deduction_schedule);
//       setLoanDeductionAmount(loan.final_loan_deduction || loan.payable_per_term);
//     }
//   }, [selectedPayroll]);

//   const handleScheduleChange = (event) => {
//     setDeductionSchedule(event.target.value);
//   };

//   const handleDeductionChange = (e) => {
//     setLoanDeductionAmount(e.target.value);
//   };

//   const handleSave = async () => {
//     if (onSaveDeduction && loanDeductionAmount && deductionSchedule !== '') {
//       setIsSaving(true);

//       await onSaveDeduction({
//         deductionSchedule,
//         loanDeductionAmount: parseFloat(loanDeductionAmount),
//         loanId: activeLoans[0]?.loan_id,
//       });

//       setIsSaving(false);
//     }
//   };

//   return (
//     <div className="flex flex-col p-4 bg-white min-h-[350px]">
//       <Typography variant="h6" gutterBottom style={{ fontSize: '13px' }}>
//         Loan Info & Manual Deduction
//       </Typography>

//       {activeLoans.length === 0 ? (
//         <Typography variant="body2" color="text.secondary" style={{ fontSize: '13px' }}>
//           No active loan found for this employee.
//         </Typography>
//       ) : (
//         activeLoans.map((loan, idx) => (
//           <div
//             key={idx}
//             className="p-2 mb-3 text-[13px] bg-gray-100 rounded shadow-sm leading-tight"
//           >
//             <p><strong>Schedule:</strong> {loan.deduction_schedule}</p>
//             <p><strong>Pay per term:</strong> ₱{loan.payable_per_term}</p>
//             <p><strong>Loan Amount:</strong> ₱{loan.loan_amount}</p>
//             <p><strong>Balance:</strong> ₱{loan.balance}</p>
//           </div>
//         ))
//       )}

//       <Divider className="my-2" />

//       <div className="mb-4">
//         <p className="mb-1 font-medium text-[13px]">Set Loan Deduction (Manual)</p>
//         <TextField
//           fullWidth
//           type="number"
//           size="small"
//           value={loanDeductionAmount}
//           onChange={handleDeductionChange}
//           placeholder="Enter deduction amount"
//           inputProps={{ min: 0 }}
//           label="Final Loan Deduction"
//           InputLabelProps={{ style: { fontSize: '13px' } }}
//           InputProps={{ style: { fontSize: '13px' } }}
//         />
//       </div>

//       {/* Deduction schedule dropdown (optional) */}
//       {/* 
//       <FormControl fullWidth className="mb-4" size="small">
//         <InputLabel style={{ fontSize: '11px' }}>Deduction Schedule</InputLabel>
//         <Select
//           value={deductionSchedule}
//           onChange={handleScheduleChange}
//           label="Deduction Schedule"
//           style={{ fontSize: '11px' }}
//         >
//           <MenuItem value="monthly" style={{ fontSize: '11px' }}>Monthly</MenuItem>
//           <MenuItem value="semi-monthly" style={{ fontSize: '11px' }}>Semi-Monthly</MenuItem>
//           <MenuItem value="current-payroll" style={{ fontSize: '11px' }}>Current Payroll Only</MenuItem>
//         </Select>
//       </FormControl>
//       */}

//       <Button
//         className="z-0"
//         variant="contained"
//         color="primary"
//         onClick={handleSave}
//         disabled={isSaving}
//         size="small"
//         style={{ fontSize: '11px', padding: '6px 12px', minWidth: '130px' }}
//       >
//         {isSaving ? (
//           <>
//             <CircularProgress size={14} color="inherit" className="mr-2" />
//             Saving...
//           </>
//         ) : (
//           'Save Deduction'
//         )}
//       </Button>


//       Contribution Deduction Type....
//     </div>
//   );
// }

// export default PayrollSettings;
