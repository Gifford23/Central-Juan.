import React, { useState, useEffect } from "react";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Swal from "sweetalert2";

function ContributionTypeSelector({ selectedPayroll, onUpdateContributionType }) {
  const [contributionType, setContributionType] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // ONLY sync when selectedPayroll (or its id) changes.
  // This avoids overwriting user selection while they interact.
  useEffect(() => {
    setContributionType(selectedPayroll?.contribution_deduction_type || "");
  }, [selectedPayroll?.payroll_id]); // or [selectedPayroll] if you prefer

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
    try {
      Swal.fire({
        title: "Updating...",
        text: "Please wait while updating contribution deduction type.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // call parent's update handler (which performs API call)
      const response = await onUpdateContributionType({
        payroll_id: selectedPayroll?.payroll_id,
        contribution_deduction_type: contributionType,
      });

      if (response?.success) {
        Swal.fire("✅ Success!", "Contribution deduction type updated successfully.", "success");
        // Optionally: rely on parent to update selectedPayroll prop.
        // If parent DOES NOT update selectedPayroll, you can still keep local state as the chosen value.
        // (No need to setContributionType here because it's already the selected value.)
      } else {
        Swal.fire("⚠️ Failed!", response?.message || "Unknown error.", "warning");
        // If backend returns error, optionally reset to server value:
        // setContributionType(selectedPayroll?.contribution_deduction_type || "");
      }
    } catch (error) {
      console.error("Error updating contribution deduction type:", error);
      Swal.fire("❌ Error!", "Could not update contribution type.", "error");
      // reset to server value (optional)
      // setContributionType(selectedPayroll?.contribution_deduction_type || "");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col mb-4">
      <p className="mb-2 text-xs font-medium text-gray-700 sm:text-sm">
        Update Contribution Deduction Type
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FormControl fullWidth size="small" className="sm:flex-1">
          <Select
            value={contributionType}
            onChange={(e) => setContributionType(e.target.value)}
            style={{ fontSize: "12px" }}
            disabled={isUpdating} // disable while in-flight
          >
            <MenuItem value="monthly" style={{ fontSize: "12px" }}>Monthly</MenuItem>
            <MenuItem value="semi-monthly" style={{ fontSize: "12px" }}>Semi-Monthly</MenuItem>
          </Select>
        </FormControl>

        <Button
          className="z-0 w-full sm:w-auto"
          variant="contained"
          color="primary"
          onClick={handleUpdateContributionType}
          disabled={isUpdating}
          size="small"
          style={{ fontSize: "12px", padding: "6px 12px", minWidth: "150px" }}
        >
          {isUpdating ? (
            <>
              <CircularProgress size={14} color="inherit" className="mr-2" />
              Updating...
            </>
          ) : (
            "Update"
          )}
        </Button>
      </div>
    </div>
  );
}

export default ContributionTypeSelector;






// import React, { useState, useEffect } from "react";
// import FormControl from "@mui/material/FormControl";
// import MenuItem from "@mui/material/MenuItem";
// import Select from "@mui/material/Select";
// import Button from "@mui/material/Button";
// import CircularProgress from "@mui/material/CircularProgress";
// import Swal from "sweetalert2";

// function ContributionTypeSelector({ selectedPayroll, onUpdateContributionType }) {
//   const [contributionType, setContributionType] = useState("");
//   const [isUpdating, setIsUpdating] = useState(false);

// useEffect(() => {
//   if (selectedPayroll?.contribution_deduction_type !== contributionType) {
//     setContributionType(selectedPayroll?.contribution_deduction_type || "");
//   }
// }, [selectedPayroll, contributionType]);


//   const handleUpdateContributionType = async () => {
//     if (!onUpdateContributionType) {
//       console.warn("onUpdateContributionType not provided");
//       return;
//     }
//     if (!contributionType) {
//       Swal.fire("⚠️ Missing", "Select a contribution deduction type.", "warning");
//       return;
//     }

//     setIsUpdating(true);
//     try {
//       Swal.fire({
//         title: "Updating...",
//         text: "Please wait while updating contribution deduction type.",
//         allowOutsideClick: false,
//         didOpen: () => {
//           Swal.showLoading();
//         },
//       });

//       const response = await onUpdateContributionType({
//         payroll_id: selectedPayroll?.payroll_id,
//         contribution_deduction_type: contributionType,
//       });

//       if (response?.success) {
//         Swal.fire("✅ Success!", "Contribution deduction type updated successfully.", "success");
//       } else {
//         Swal.fire("⚠️ Failed!", response?.message || "Unknown error.", "warning");
//       }
//     } catch (error) {
//       console.error("Error updating contribution deduction type:", error);
//       Swal.fire("❌ Error!", "Could not update contribution type.", "error");
//     } finally {
//       setIsUpdating(false);
//     }
//   };

//   return (
// <div className="flex flex-col mb-4">
//   {/* Label */}
//   <p className="mb-2 text-xs font-medium text-gray-700 sm:text-sm">
//     Update Contribution Deduction Type
//   </p>

//   {/* Wrapper for Select + Button */}
//   <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
//     {/* Select */}
//     <FormControl fullWidth size="small" className="sm:flex-1">
//       <Select
//         value={contributionType}
//         onChange={(e) => setContributionType(e.target.value)}
//         style={{ fontSize: "12px" }}
//       >
//         <MenuItem value="monthly" style={{ fontSize: "12px" }}>Monthly</MenuItem>
//         <MenuItem value="semi-monthly" style={{ fontSize: "12px" }}>Semi-Monthly</MenuItem>
//       </Select>
//     </FormControl>

//     {/* Button */}
//     <Button
//       className="z-0 w-full sm:w-auto"
//       variant="contained"
//       color="primary"
//       onClick={handleUpdateContributionType}
//       disabled={isUpdating}
//       size="small"
//       style={{ fontSize: "12px", padding: "6px 12px", minWidth: "150px" }}
//     >
//       {isUpdating ? (
//         <>
//           <CircularProgress size={14} color="inherit" className="mr-2" />
//           Updating...
//         </>
//       ) : (
//         "Update"
//       )}
//     </Button>
//   </div>
// </div>

//   );
// }

// export default ContributionTypeSelector;
