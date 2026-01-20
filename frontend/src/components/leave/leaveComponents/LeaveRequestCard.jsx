import React from "react";
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  FormControl, 
  Select, 
  MenuItem, 
  InputLabel, 
  Tooltip 
} from "@mui/material";
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

const LeaveRequestCard = ({ request, isChecked, onCheckboxChange, onStatusChange }) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const getBackgroundColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved": return "#e9f7ef";
      case "rejected": return "#fdecea";
      default: return "#fffde7";
    }
  };

  const currentStatus = ["pending", "approved", "rejected"].includes(request.status) 
    ? request.status 
    : "pending";

  return (
    <Card 
      sx={{ 
        backgroundColor: getBackgroundColor(request.status),
        borderRadius: 3,
        boxShadow: 3,
        mb: 2
      }}
    >
      <CardContent>
        {/* Header with checkbox + name */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center">
            <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={onCheckboxChange} 
              style={{ marginRight: 8 }} 
            />
            <Tooltip title={request.employee_name}>
              <Typography 
                fontWeight="bold" 
                noWrap 
                sx={{ maxWidth: 200 }}
              >
                {request.employee_name}
              </Typography>
            </Tooltip>
          </Box>
        </Box>

        {/* Basic details */}
        <Tooltip title={request.employee_id}>
          <Typography variant="body2" color="text.secondary" noWrap>
            ID: {request.employee_id}
          </Typography>
        </Tooltip>
        <Tooltip title={request.leave_type_name}>
          <Typography variant="body2" color="text.secondary" mt={1} noWrap>
            Leave Type: {request.leave_type_name}
          </Typography>
        </Tooltip>
        <Typography variant="body2" color="text.secondary" mt={1}>
          Created at: {request.created_at}
        </Typography>

        {/* Leave period */}
        <Box mt={2} p={2} bgcolor="#f0f4ff" borderRadius={2}>
          <Typography variant="body2"><strong>From:</strong> {formatDate(request.date_from)}</Typography>
          <Typography variant="body2"><strong>To:</strong> {formatDate(request.date_until)}</Typography>
          <Typography variant="body2" color="primary"><strong>Total Days:</strong> {request.total_days}</Typography>

          {String(request.is_paid) === "1" && (
            <>
              <Typography variant="body2" mt={1}>
                <strong>Available Balance:</strong> {request.leave_balance ? request.leave_balance : "0"}
              </Typography>

              {/* Show projected balance only if not approved */}
              {request.status?.toLowerCase() !== "approved" && (
                <Typography
                  variant="body2"
                  mt={1}
                  sx={{
                    fontWeight: "bold",
                    color: parseFloat(request.projected_balance) < 0 ? "red" : "green"
                  }}
                >
                  Remaining After Deduction:{" "}
                  {request.projected_balance !== null ? request.projected_balance : "N/A"}
                </Typography>
              )}
            </>
          )}
        </Box>

        {/* Reason with text control */}
        <Tooltip title={request.reason || "No reason provided"}>
          <Typography 
            variant="body2" 
            mt={2} 
            noWrap 
            sx={{ maxWidth: "100%" }}
          >
            Reason: {request.reason || "No reason provided"}
          </Typography>
        </Tooltip>

        {/* Status select */}
{!permLoading && permissions.can_edit && (

        <FormControl fullWidth size="small" sx={{ mt: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={currentStatus}
            onChange={(e) => {
              const newStatus = e.target.value.toLowerCase();
              if (newStatus === "approved") {
                console.log(`Leave ID ${request.leave_id} approved for ${request.employee_name}`);
              }
              onStatusChange(request.leave_id, newStatus);
            }}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>

        </FormControl>
)}
      </CardContent>
    </Card>
  );
};

export default LeaveRequestCard;



// import React from "react";
// import { Card, CardContent, Typography, Box, FormControl, Select, MenuItem, InputLabel } from "@mui/material";

// function formatDate(dateStr) {
//   if (!dateStr) return "—";
//   const date = new Date(dateStr);
//   return date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
// }

// const LeaveRequestCard = ({ request, isChecked, onCheckboxChange, onStatusChange }) => {
//   const getBackgroundColor = (status) => {
//     switch (status?.toLowerCase()) {
//       case "approved": return "#e9f7ef";
//       case "rejected": return "#fdecea";
//       default: return "#fffde7";
//     }
//   };

//   const currentStatus = ["Pending", "Approved", "Rejected"].includes(request.status) 
//     ? request.status 
//     : "Pending";

//   return (
//     <Card sx={{ backgroundColor: getBackgroundColor(request.status) }}>
//       <CardContent>
//         <Box display="flex" justifyContent="space-between" alignItems="center">
//           <Box display="flex" alignItems="center">
//             <input type="checkbox" checked={isChecked} onChange={onCheckboxChange} className="mr-2" />
//             <Typography fontWeight="bold">{request.employee_name}</Typography>
//           </Box>
//         </Box>

//         <Typography variant="body2" color="text.secondary">ID: {request.employee_id}</Typography>
//         <Typography variant="body2" color="text.secondary" mt={1}>Leave Type: {request.leave_type_name}</Typography>
//         <Typography variant="body2" color="text.secondary" mt={1}>created at: {request.created_at}</Typography>

//         <Box mt={1} p={1} bgcolor="#f0f4ff" borderRadius={1}>
//           <Typography variant="body2"><strong>From:</strong> {formatDate(request.date_from)}</Typography>
//           <Typography variant="body2"><strong>To:</strong> {formatDate(request.date_until)}</Typography>
//           <Typography variant="body2" color="primary"><strong>Total Days:</strong> {request.total_days}</Typography>

//           {String(request.is_paid) === "1" && (
//             <>
//               <Typography variant="body2" mt={1}>
//                 <strong>Available Balance:</strong> {request.leave_balance ? request.leave_balance : "0"}
//               </Typography>

//               {/* Show projected balance only if not approved */}
//               {request.status?.toLowerCase() !== "approved" && (
//                 <Typography
//                   variant="body2"
//                   mt={1}
//                   sx={{
//                     fontWeight: "bold",
//                     color: parseFloat(request.projected_balance) < 0 ? "red" : "green"
//                   }}
//                 >
//                   Remaining After Deduction:{" "}
//                   {request.projected_balance !== null ? request.projected_balance : "N/A"}
//                 </Typography>
//               )}
//             </>
//           )}
//         </Box>

//         <Typography variant="body2" mt={1}>Reason: {request.reason || "No reason provided"}</Typography>

//         <FormControl fullWidth size="small" sx={{ mt: 2 }}>
//           <InputLabel>Status</InputLabel>
//           <Select
//             value={currentStatus}
//             onChange={(e) => onStatusChange(request.leave_id, e.target.value)}
//           >
//             <MenuItem value="Pending">Pending</MenuItem>
//             <MenuItem value="Approved">Approved</MenuItem>
//             <MenuItem value="Rejected">Rejected</MenuItem>
//           </Select>
//         </FormControl>
//       </CardContent>
//     </Card>
//   );
// };

// export default LeaveRequestCard;
