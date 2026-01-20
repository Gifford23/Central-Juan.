import React from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const AddLeaveTypeButton = ({ onClick }) => {
  return (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      color="primary"
      onClick={onClick}
      size="small"
    >
      Add Leave Type
    </Button>
  );
};

export default AddLeaveTypeButton;
