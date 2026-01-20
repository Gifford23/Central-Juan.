import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import DeselectIcon from '@mui/icons-material/RemoveDone';

const NotificationActionButtonEmp = ({
  selectedIds,
  onDeleteSelected,
  onSelectAll,
  onDeselectAll,
  filterType,
  setFilterType,
  filterStatus,
  setFilterStatus
}) => {
  const [allSelected, setAllSelected] = useState(false);

  const handleToggleSelect = () => {
    if (allSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
    setAllSelected(!allSelected);
  };

  return (
    <Paper elevation={1} sx={{ p: 1, borderRadius: 2 }}>
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" justifyContent="center">
        
        <Tooltip title={`Delete selected (${selectedIds.size})`}>
          <span>
            <IconButton
              color="error"
              onClick={onDeleteSelected}
              disabled={selectedIds.size === 0}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={allSelected ? 'Deselect All' : 'Select All'}>
          <IconButton
            color="primary"
            onClick={handleToggleSelect}
          >
            {allSelected ? <DeselectIcon /> : <SelectAllIcon />}
          </IconButton>
        </Tooltip>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterType}
            label="Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Overtime">Overtime</MenuItem>
            <MenuItem value="Attendance">Attendance</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
};

export default NotificationActionButtonEmp;
