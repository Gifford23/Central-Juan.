import React from 'react';
import {
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Box,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 

const EmployeeActionsDropdown = ({ employee, onEdit, onDelete, onToggleStatus }) => {
  const { user } = useSession();
  // const { permissions, loading: permLoading } = usePermissions(user?.role);
  const { permissions, loading: permLoading } = usePermissions(user?.username); 

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleEdit = () => {
    handleClose();
    onEdit(employee);
  };

  const handleDelete = () => {
    handleClose();
    onDelete(employee.employee_id);
  };

  const handleToggle = () => {
    handleClose();
    onToggleStatus(employee);
  };

  const isActive = employee.status === 'active';

  return (
    <>
      <IconButton
        aria-controls={open ? 'employee-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpen}
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        id="employee-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'employee-menu-button',
          sx: { padding: 0, width: 200 },
        }}
      >
   {!permLoading && permissions?.can_edit && (
     
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" className="mr-2 text-blue-600" />
          <span className="text-sm">Edit</span>
        </MenuItem>
   )}
   {!permLoading && permissions?.can_delete && (

        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" className="mr-2 text-red-600" />
          <span className="text-sm">Delete</span>
        </MenuItem>
   )}
        <Divider />
          {!permLoading ? (permissions?.can_edit ? (
              <MenuItem onClick={handleToggle} disableRipple>
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Typography variant="body2" color={isActive ? 'green' : 'text.secondary'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Typography>
                  <Switch
                    size="small"
                    checked={isActive}
                    onChange={handleToggle}
                    color="success"
                  />
                </Box>
              </MenuItem>
            ) : (
              <MenuItem disableRipple>
                <Typography variant="body2" color="error">
                  Admin Access Only
                </Typography>
              </MenuItem>
            )
          ) : null}

      </Menu>
    </>
  );
};

export default EmployeeActionsDropdown;
