import { useEffect, useState } from "react";
import axios from "axios";
import { useSession } from "../context/SessionContext";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../../backend/server/config";
import EmployeeMobileDashboardModal from "./EmployeeMobileDashboardModal";
import {
  UserRound,
  Mail,
  Phone,
  Calendar,
  Building2,
  Activity,
  FileText,
  ChevronDown,
  ChevronUp,
  Edit,
} from "lucide-react";
import TimeInOut from "./employee/Time_IN_OUT/Emp_TIO_Component/Emp_TIO_page";
import EmployeeDTR from "./dtr/employeeDTR";
import EmployeeshortCut from "./EmployeeShortCut";
import EmployeeWeeklyCalendarMobile from "./EmployeeWeeklyCalendarMobile";

function EmployeeMobileDashboard() {
  const { user } = useSession();
  const navigate = useNavigate();

  const [employeeData, setEmployeeData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!user?.username) {
      setErrorMessage("No user session found. Please log in again.");
      navigate("/login");
      return;
    }

    const fetchEmployeeData = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/mobile/getEmployee.php`, {
          params: { employee_id: user.username },
          headers: { "Content-Type": "application/json" },
        });

        if (response.data && response.data.employee_id) {
          const { password, ...safeData } = response.data;
          setEmployeeData(safeData);
        } else {
          setErrorMessage("No employee data found");
        }
      } catch (error) {
        console.error("Error fetching employee data:", error);
        setErrorMessage("Error fetching employee data");
      }
    };

    fetchEmployeeData();
  }, [user?.username, navigate]);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("employee_id", user.username);

      axios
        .post(`${BASE_URL}/mobile/uploadImage.php`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((response) => {
          if (response.data.success) {
            setEmployeeData((prev) => ({
              ...prev,
              image: response.data.imageUrl,
            }));
          } else {
            setErrorMessage("Failed to upload image");
          }
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
          setErrorMessage("Error uploading image");
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
        { headers: { "Content-Type": "application/json" } },
      );

      if (response.data.status === "success") {
        setEmployeeData(updatedData);
        closeModal();
      } else {
        setErrorMessage(
          response.data.message || "Error updating employee data",
        );
      }
    } catch (error) {
      console.error("Error updating employee data:", error);
      setErrorMessage("Error updating employee data");
    }
  };

  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-linear-to-br from-red-50 to-red-100">
        <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-lg">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <Activity className="w-6 h-6 text-red-600" />
          </div>
          <p className="text-center text-red-600 font-medium">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 pb-8">
      <div className="w-full max-w-4xl mx-auto px-4 pt-6">
        {/* Header Card with Profile */}
        <div className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl overflow-hidden mb-6">
          <div className="p-6 pb-4">
            <div className="flex items-start gap-4">
              <label
                htmlFor="image-upload"
                className="relative shrink-0 cursor-pointer group"
              >
                {employeeData.image ? (
                  <img
                    src={employeeData.image}
                    alt={`${employeeData.first_name} ${employeeData.last_name}`}
                    className="object-cover border-4 border-white/30 rounded-2xl w-20 h-20 shadow-lg transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex items-center justify-center bg-white/20 border-4 border-white/30 rounded-2xl w-20 h-20 shadow-lg transition-transform group-hover:scale-105">
                    <UserRound className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-lg">
                  <Edit className="w-4 h-4 text-blue-600" />
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <h1 className="text-xl font-bold text-white">
                    {employeeData.first_name} {employeeData.middle_name}{" "}
                    {employeeData.last_name}
                  </h1>
                  {/* Professional On Duty Badge - Responsive */}
                  <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-linear-to-r from-green-500 to-green-600 text-white text-[10px] sm:text-xs font-bold rounded-full shadow-md border border-green-400">
                    ON DUTY
                  </div>
                </div>
                <p className="text-blue-100 text-sm mb-3">
                  {employeeData.position_name || "Employee"}
                </p>
                <button
                  onClick={openModal}
                  className="px-4 py-1.5 text-sm font-medium text-blue-600 bg-white rounded-full hover:bg-blue-50 transition-colors shadow-md"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/10 backdrop-blur-sm px-6 py-3 border-t border-white/20">
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center justify-between w-full text-white"
            >
              <span className="text-sm font-medium">Personal Information</span>
              {showDetails ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Details Section */}
        {showDetails && (
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Employee Details
            </h2>
            <div className="space-y-3">
              <DetailItem
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={employeeData.email}
              />
              <DetailItem
                icon={<Phone className="w-4 h-4" />}
                label="Contact"
                value={employeeData.contact_number}
              />
              <DetailItem
                icon={<Calendar className="w-4 h-4" />}
                label="Date of Birth"
                value={
                  employeeData.date_of_birth &&
                  employeeData.date_of_birth !== "0000-00-00"
                    ? new Date(employeeData.date_of_birth).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "N/A"
                }
              />
              <DetailItem
                icon={<Building2 className="w-4 h-4" />}
                label="Department"
                value={employeeData.department_name}
              />
              <DetailItem
                icon={<Activity className="w-4 h-4" />}
                label="Status"
                value={employeeData.status}
                statusBadge
              />
              {employeeData.description && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-1 font-medium">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {employeeData.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly Calendar */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Weekly Schedule
          </h2>
          <EmployeeWeeklyCalendarMobile employeeId={employeeData.employee_id} />
        </div>

        {/* Time In/Out Section */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Time Tracking
          </h2>
          <TimeInOut
            key={employeeData.employee_id}
            employeeName={`${employeeData.first_name} ${employeeData.middle_name || ""} ${employeeData.last_name}`.trim()}
            employeeId={employeeData.employee_id}
          />
        </div>

        {/* Request Section */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
            Quick Actions
          </h2>
          <EmployeeshortCut employeeData={employeeData} />
        </div>

        {/* DTR Section */}
        <div className="bg-white rounded-3xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Daily Time Record
          </h2>
          <EmployeeDTR
            employeeId={employeeData.employee_id}
            employeeName={`${employeeData.first_name} ${employeeData.middle_name || ""} ${employeeData.last_name}`}
          />
        </div>
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

const DetailItem = ({ icon, label, value, statusBadge }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {statusBadge ? (
        <span
          className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${
            value?.toLowerCase() === "active"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {value || "N/A"}
        </span>
      ) : (
        <p className="text-sm font-medium text-gray-800 truncate">
          {value || "N/A"}
        </p>
      )}
    </div>
  </div>
);

export default EmployeeMobileDashboard;
