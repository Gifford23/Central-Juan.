import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from '../context/SessionContext';
import { useNavigate } from 'react-router-dom';
import BASE_URL from '../../backend/server/config';
import EmployeeMobileDashboardModal from './EmployeeMobileDashboardModal';
import { UserRound, UserPen } from 'lucide-react';
import TimeInOut from './employee/Time_IN_OUT/Emp_TIO_Component/Emp_TIO_page';
import EmployeeDTR from './dtr/employeeDTR';
import EmployeeshortCut from './EmployeeShortCut';
import EmployeeWeeklyCalendarMobile from './EmployeeWeeklyCalendarMobile';

function EmployeeMobileDashboard() {
  const { user } = useSession();
  const navigate = useNavigate();

  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user?.username) {
      setErrorMessage('No user session found. Please log in again.');
      navigate('/login');
      return;
    }

    const fetchEmployeeData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/mobile/getEmployee.php`, {
          params: { employee_id: user.username },
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data && response.data.employee_id) {
          const { password, ...safeData } = response.data;
          setEmployeeData(safeData);
        } else {
          setErrorMessage('No employee data found');
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        setErrorMessage('Error fetching employee data');
      }
    };

    fetchEmployeeData();
  }, [user?.username, navigate]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('employee_id', user.username);

      axios
        .post(`${BASE_URL}/mobile/uploadImage.php`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((response) => {
          if (response.data.success) {
            setEmployeeData((prev) => ({
              ...prev,
              image: response.data.imageUrl,
            }));
          } else {
            setErrorMessage('Failed to upload image');
          }
        })
        .catch((error) => {
          console.error('Error uploading image:', error);
          setErrorMessage('Error uploading image');
        });
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSaveChanges = async (updatedData) => {
    try {
      const response = await axios.put(
        `${BASE_URL}/mobile/employee/update_employee.php`,
        { ...updatedData, employee_id: employeeData.employee_id },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.status === 'success') {
        setEmployeeData(updatedData);
        closeModal();
      } else {
        setErrorMessage(response.data.message || 'Error updating employee data');
      }
    } catch (error) {
      console.error('Error updating employee data:', error);
      setErrorMessage('Error updating employee data');
    }
  };

  if (errorMessage) {
    return <div className="mt-4 text-center text-red-500">{errorMessage}</div>;
  }

  if (!employeeData) {
    return <div className="mt-4 text-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col items-center w-full h-full px-4">
      <div className="flex flex-col w-full p-6 shadow-md bg-white/60 rounded-2xl">

        {/* Profile Section */}
        <div className="flex items-center w-full gap-4 p-4 bg-white rounded-lg shadow">
          <label htmlFor="image-upload" className="relative flex-shrink-0 cursor-pointer">
            {employeeData.image ? (
              <img
                src={employeeData.image}
                alt={`${employeeData.first_name} ${employeeData.last_name}`}
                className="object-cover border border-gray-300 rounded-full w-[60px] h-[60px]"
              />
            ) : (
              <div className="flex items-center justify-center bg-gray-100 border border-gray-300 rounded-full w-[60px] h-[60px]">
                <UserRound className="w-6 h-6 text-gray-500" />
              </div>
            )}
            <UserPen className="absolute bottom-0 right-0 w-3 h-3 p-[2px] text-white bg-blue-600 rounded-full" />
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          <div className="flex flex-col justify-center">
            <h1 className="text-base font-semibold text-gray-800">
              {employeeData.first_name} {employeeData.middle_name} {employeeData.last_name}
            </h1>
            <span className="text-sm text-gray-500">
              {employeeData.position_name || 'Employee'}
            </span>
            <button
              onClick={openModal}
              className="px-3 py-[2px] mt-2 text-xs text-white bg-green-500 rounded-full hover:bg-green-600 w-fit"
            >
              Edit Profile
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowDetails((prev) => !prev)}
          className="mt-2 text-xs text-blue-500 underline"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>

        <EmployeeWeeklyCalendarMobile employeeId={employeeData.employee_id} />

        {showDetails && (
          <div className="w-full mt-3 space-y-1">
            <InfoRow label="Email" value={employeeData.email} />
            <InfoRow label="Contact" value={employeeData.contact_number} />
            <InfoRow
              label="Date of Birth"
              value={
                employeeData.date_of_birth && employeeData.date_of_birth !== '0000-00-00'
                  ? new Date(employeeData.date_of_birth).toLocaleDateString()
                  : 'N/A'
              }
            />
            <InfoRow label="Department" value={employeeData.department_name} />
            <InfoRow label="Status" value={employeeData.status} />
            <InfoRow label="Description" value={employeeData.description} />
          </div>
        )}

        <div className="flex justify-center w-full mt-4">
          <TimeInOut
            key={employeeData.employee_id}
            employeeName={`${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`.trim()}
            employeeId={employeeData.employee_id}
          />
        </div>

        <div className="h-px my-5 bg-gray-400"></div>

        <h1 className="pt-1 mb-2 font-bold text-center text-blue-600">Request</h1>
        <EmployeeshortCut employeeData={employeeData} />
      </div>

      <div className="w-full p-4 mt-3 border-t">
        <EmployeeDTR 
          employeeId={employeeData.employee_id}
          employeeName={`${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`}
        />
        
      </div>

      <EmployeeMobileDashboardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        formData={employeeData}
        onSave={handleSaveChanges}
      />
    </div>
  );
}

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between pb-1 text-gray-700 border-b border-gray-200">
    <span className="font-medium">{label}:</span>
    <span>{value || 'N/A'}</span>
  </div>
);

export default EmployeeMobileDashboard;
