import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import EmployeeTypeBadge from '../employeeComponents/EmployeeTypebadge';
import EmployeeActionsDropdown from '../employeeComponents/EmployeeActionDropdown';

import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 


const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  marginLeft: 'auto',
  transform: !expand ? 'rotate(0deg)' : 'rotate(180deg)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const EmployeeGridView = ({
  loading,
  filteredEmployees,
  handleEditEmployee,
  handleDeleteEmployee,
  selectedEmployees,
  handleSelectAll,
  handleSelectEmployee,
  handleToggleStatus,
}) => {

  const { user } = useSession();
  // const { permissions, loading: permLoading } = usePermissions(user?.role);
  const { permissions, loading: permLoading } = usePermissions(user?.username); 


  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedEmployeeId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {loading ? (
        <p className="text-gray-600">Loading employees...</p>
      ) : (
        <div className="grid items-start grid-cols-2 gap-10 pb-5 2xl:grid-cols-6 lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2">
          {filteredEmployees.map((employee) => {
            const isExpanded = expandedEmployeeId === employee.employee_id;

            return (
              <div
                key={employee.employee_id}
                className="flex flex-col p-4 transition-all duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
              >
                {/* Employee Image */}
                <div className="w-full h-[120px] 2xl:h-60 xl:h-40 md:h-40 overflow-hidden rounded-lg bg-gray-100">
                  {employee.image ? (
                    <img
                      src={employee.image}
                      alt="Employee"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-gray-200">
                      <UserRound className="text-gray-500" size={48} />
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex flex-col items-center mt-4">
                  <span className="w-full font-semibold text-center text-ellipsis overflow-clip hover:text-wrap">
                    {employee.first_name || "N/A"} {employee.middle_name || ""} {employee.last_name || "N/A"}
                  </span>
                  <span className="w-full text-sm text-center text-gray-500 text-ellipsis overflow-clip hover:text-wrap">
                    Emp. ID: {employee.employee_id || "N/A"}
                  </span>

                  <span className="w-full text-sm text-center text-gray-500 text-ellipsis overflow-clip hover:text-wrap">
                    Assigned Branch: {employee.branch_name || "Not assigned"}
                  </span>

                  {/* Status */}
                  <div
                    className={`mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      employee.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {employee.status === 'active' ? 'Active' : 'Inactive'}
                  </div>

                  {/* Type */}
                  <strong className="font-bold text-[13px] w-full flex justify-center my-2">
                    <EmployeeTypeBadge type={employee.employee_type} />
                  </strong>
                </div>
 
                {/* View Details Button */}
                <div className="mt-2">
                  <button
                    onClick={() => toggleExpand(employee.employee_id)}
                    className="w-full text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>

                  {/* Expanded Details */}
                  <div
                    className={`transition-all duration-500 ${
                      isExpanded ? "h-auto opacity-100 mt-2" : "h-0 opacity-0"
                    } overflow-hidden space-y-1 text-sm text-gray-700`}
                  >
                    <div><strong>Department:</strong> {employee.department_name || "N/A"}</div>
                    <div><strong>Position:</strong> {employee.position_name || "N/A"}</div>
                        {!permLoading && permissions.can_view && (

                    <div><strong>Base Salary:</strong> {employee.base_salary || "N/A"}</div>
                        )}
                    <div><strong>Contact:</strong> {employee.contact_number || "N/A"}</div>
                    <div>
                      <strong>DOB:</strong>{" "}
                      {employee.date_of_birth
                        ? new Date(employee.date_of_birth).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </div>

                        {/* Action Dropdown */}
                        {!permLoading && permissions.can_edit && (

                        <div className="flex justify-end pt-2 z-100">


                          <EmployeeActionsDropdown
                            employee={employee}
                            onEdit={handleEditEmployee}
                            onDelete={handleDeleteEmployee}
                            onToggleStatus={handleToggleStatus}
                          />

                        </div>
                        )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default EmployeeGridView;
