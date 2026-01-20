import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/sidebar';
import MobileAdminNav from './mobileAdminNav';
import DropDownEmp from '../../mobile/EmployeeNav';
import { useSession } from '../../context/SessionContext';
import BASE_URL from '../../../backend/server/config';
import axios from 'axios';
import useRoles from '../../authentication/useRoles'; // ✅ dynamic roles

const Layout = ({ isMobile }) => {
  const { user } = useSession();
  const [employeeData, setEmployeeData] = useState(null); 
  const navigate = useNavigate();

  const { roles, loading: rolesLoading } = useRoles();

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/mobile/getEmployee.php`, {
          params: { employee_id: user.username },
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data && response.data.employee_id) {
          const { password, ...safeData } = response.data;
          setEmployeeData(safeData);
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
      }
    };

    if (user?.username) {
      fetchEmployeeData();
    }
  }, [user?.username]);

  const handleGoToAttendance = () => { /* ... */ };
  const handleGoToTimeInOut = () => { /* ... */ };
  const handleRequestOvertime = () => { /* ... */ };

  if (rolesLoading) return <div>Loading...</div>;

  const roleNames = roles.map(r => r.role_name.toUpperCase());
  const adminRoles = roleNames.filter(r => r !== 'EMPLOYEE');
  const employeeRoles = roleNames.filter(r => r === 'EMPLOYEE');

  if (adminRoles.includes(user?.role)) {
    return (
      <div className='flex flex-col h-full'>
        <nav className='min-h-[20px] w-full h-full bg-slate-900 flex'>
          {isMobile ? <MobileAdminNav /> : <Sidebar />}
        </nav>
        <main className='layout-mobileAdmin'>
          <Outlet />
        </main>
      </div>
    );
  }

  if (employeeRoles.includes(user?.role) || adminRoles.includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full max-h-full font-sans employee-Mdash-container">
        <div className="w-full h-full max-w-[500px] items-center flex flex-col pt-[30px]">
          <div className="w-[90vw] flex flex-row justify-end absolute">
            <DropDownEmp
              onGoToAttendance={handleGoToAttendance}
              onGoToTimeInOut={handleGoToTimeInOut}
              onGoToRequestOver={handleRequestOvertime}
              employeeData={employeeData}
            />
          </div>
          <div className="flex items-center justify-center w-full h-full py-[45px]">
            <Outlet context={{ user }} />
          </div>
        </div>
      </div>
    );
  }

  return <div>Unauthorized</div>;
};

export default Layout;
