import React from 'react';
import {
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Box,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SaveIcon from '@mui/icons-material/Save';
import ClearIcon from '@mui/icons-material/Clear';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const DTRRecordActionDropdown = ({ onSave, onClear, onAddOvertime }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleAction = (action) => {
    handleClose();
    action();
  };

  return (
    <>
      <IconButton
        aria-controls={open ? 'dtr-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpen}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        id="dtr-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'dtr-menu-button',
          sx: { padding: 0, width: 200 },
        }}
      >
        <MenuItem onClick={() => handleAction(onSave)}>
          <SaveIcon fontSize="small" className="mr-2 text-blue-600" />
          <span className="text-sm">Save</span>
        </MenuItem>

        <MenuItem onClick={() => handleAction(onClear)}>
          <ClearIcon fontSize="small" className="mr-2 text-yellow-600" />
          <span className="text-sm">Clear Record</span>
        </MenuItem>

        <MenuItem onClick={() => handleAction(onAddOvertime)}>
          <AccessTimeIcon fontSize="small" className="mr-2 text-green-600" />
          <span className="text-sm">Add Overtime</span>
        </MenuItem>
      </Menu>
    </>
  );
};

export default DTRRecordActionDropdown;
