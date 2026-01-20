import React from "react";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 
import TopTabBar from "../../breadcrumbs/Tabs";
import { useSession } from "../../../context/SessionContext";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
const LoanHeader = ({ onAddLoan, onViewJournalEntries }) => {
  const { user } = useSession();
  // const { permissions, loading: permLoading } = usePermissions(user?.role);
  const { permissions, loading: permLoading } = usePermissions(user?.username); 

  
  const breadcrumbItems = [
    !permLoading && permissions?.payroll_records && { key: "payroll", label: "Payroll", path: "/payroll-page" },
    !permLoading && permissions?.loan && { key: "loan", label: "Loan", path: "/LoanPage" },
  ].filter(Boolean);


  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white rounded shadow-sm">
          <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>Loan Management</span>
              {/* <div className="hidden md:block"> */}
                <Breadcrumbs items={breadcrumbItems} />
              {/* </div> */}
            </div>

      <div className="flex gap-2">
        {/* Show button only if user has can_add */}
        {!permLoading && permissions?.can_add && (
          <button
            onClick={onAddLoan}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            + New Loan
          </button>
        )}
      </div>
    </div>
  );
};

export default LoanHeader;
