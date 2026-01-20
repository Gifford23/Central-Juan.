import React from 'react';
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 

import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider,
} from '@mui/material';

function formatTo12Hour(timeStr) {
  if (!timeStr || !timeStr.includes(':')) return '—';

  const [hour, minute, second] = timeStr.split(':');
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  const s = parseInt(second || '0', 10);

  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return '—';

  if (h === 0 && m === 0 && s === 0) return '';

  const date = new Date();
  date.setHours(h, m, s);

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateToText(dateStr) {
  if (!dateStr) return '—';
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj)) return dateStr;
  return dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

const LateRequestCard = ({ request, onStatusChange, onCheckboxChange, isChecked }) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  const getBackgroundColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#e9f7ef';
      case 'rejected':
        return '#fdecea';
      case 'pending':
      default:
        return '#fffde7';
    }
  };

  const getStatusDotColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
      default:
        return 'bg-yellow-500';
    }
  };

  const displayRow = (label, current, requested) => {
    const currentFormatted = formatTo12Hour(current);
    const requestedFormatted = formatTo12Hour(requested);
    const isSame = currentFormatted === requestedFormatted;

    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <Typography variant="body2" sx={{ minWidth: '120px' }}>
          {label}:
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentFormatted}
        </Typography>
        {!isSame && (
          <>
            <Typography variant="body2" color="text.secondary">→</Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 'bold',
                color: 'green',
                bgcolor: 'rgba(0, 128, 0, 0.05)',
                px: 0.5,
                borderRadius: 0.5,
              }}
            >
              {requestedFormatted}
            </Typography>
          </>
        )}
      </Box>
    );
  };

  // Ensure valid status for select
  const validStatuses = ['pending', 'approved', 'rejected'];
  const currentStatus = validStatuses.includes(request.status?.toLowerCase())
    ? request.status.toLowerCase()
    : 'pending';

  return (
    <Card sx={{ mx: 0.5, maxWidth: 345, backgroundColor: getBackgroundColor(request.status), p: 1 }}>
      <CardActionArea>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center">
              <input type="checkbox" checked={isChecked} onChange={onCheckboxChange} className="mr-2" />
              <Typography fontWeight="bold">{request.employee_name}</Typography>
            </Box>
            <span
              className={`inline-block w-3 h-3 rounded-full ${getStatusDotColor(request.status)}`}
              title={request.status}
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            ID: <strong>{request.employee_id}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Req. Date: <strong>{formatDateToText(request.attendance_date)}</strong>
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="break-words whitespace-pre-wrap overflow-hidden text-ellipsis"
            sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
          >
            Reason: <strong>{request.reason || 'No reason provided'}</strong>
          </Typography>

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary">Morning</Typography>
          {displayRow("Time In", request.current_time_in_morning, request.requested_time_in_morning)}
          {displayRow("Time Out", request.current_time_out_morning, request.requested_time_out_morning)}

          <Typography variant="caption" color="text.secondary" mt={1}>Afternoon</Typography>
          {displayRow("Time In", request.current_time_in_afternoon, request.requested_time_in_afternoon)}
          {displayRow("Time Out", request.current_time_out_afternoon, request.requested_time_out_afternoon)}

        {!permLoading && permissions?.can_edit && (

          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={currentStatus}
              onChange={(e) => onStatusChange(request.request_id, e.target.value.toLowerCase())}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default LateRequestCard;
