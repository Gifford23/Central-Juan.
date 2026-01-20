import React from 'react';
import { Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const EmployeeshortCut = ({ employeeData }) => {
  const navigate = useNavigate();

  const handleRequestOvertime = () => {
    if (!employeeData) return;
    const employeeName = `${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`.trim();
    const employeeId = employeeData.employee_id;
    navigate('/employee/requestOvertime', { state: { employeeId, employeeName } });
  };

  const handleRequestLate = () => {
    if (!employeeData) return;
    const employeeName = `${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`.trim();
    const employeeId = employeeData.employee_id;
    navigate('/employee/late-request', { state: { employeeId, employeeName } });
  };

  return (
    <Box 
      display="flex"
      flexDirection="row"
      gap={2}
      p={1}
    >
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleRequestOvertime}
        fullWidth
      >
        Overtime
      </Button>

      <Button 
        variant="outlined" 
        color="secondary" 
        onClick={handleRequestLate}
        fullWidth
      >
        Time Adj.
      </Button>
    </Box>
  );
};

export default EmployeeshortCut;
