import { useNavigate } from "react-router-dom"; 
import { Banknote, HandCoins, Wallet } from "lucide-react"; // Added Wallet icon for variety, or reuse HandCoins
import { useSession } from "../../../context/SessionContext";
// import useCardPermissions from "../../user_permisson/hooks/useCardPermissions";
import usePermissions from "../../../users/hooks/usePermissions";

const pay_dashboard_v3 = () => {
  const { user } = useSession();
  // const { cardPermissions, loading: cardPermLoading  } = useCardPermissions(user?.role);
    const { permissions, loading } = usePermissions(user?.username); 

  const navigate = useNavigate();

  const goToRecords = () => {
    console.log("Navigating to Payroll Records");
    navigate("/payroll-page");
  };

  const goToBaseSalary = () => {
    console.log("Navigating to Base Salary");
    navigate("/baseSalary");
  };

  const goToLoan = () => {
    console.log("Navigating to Loan");
    navigate("/LoanPage");
  };

    const goTM = () => {
    console.log("Navigating to Loan");
    navigate("/ThirteenthDashboard");
  };

    const gotToCommission = () => {
    console.log("Navigating to commission");
    navigate("/commission");
  };
  return (
    <div className="flex flex-col items-center justify-around w-full h-full gap-6 px-4 py-6 pb-20 text-center md:flex-row md:flex-wrap">
      {/* Payroll Records */}
          {!loading && permissions?.payroll_records && (
      <a
        onClick={goToRecords}
        className="payroll-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}

      >
        <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
          <HandCoins size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <HandCoins size={"15%"} strokeWidth={1} /> Payroll Records
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Manage Payroll Records
        </p>
      </a>
      
        )}
      {/* Base Salary */}
      {/* <a
        onClick={goToBaseSalary}
        className="payroll-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
      >
        <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
          <Banknote size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <Banknote size={"15%"} strokeWidth={1} /> Base Salary
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Manage Base Salary
        </p>
      </a> */}

      {/* New Loan Box */}
    {!loading && permissions?.loan && (
      <a
        onClick={goToLoan}
        className="payroll-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}

      >
        <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
          <Wallet size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <Wallet size={"15%"} strokeWidth={1} /> Loan/Deductions
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Manage Employee Loans/Deductions
        </p>
      </a>
            )}


    {!loading && permissions?.loan && (
      <a
        onClick={goTM}
        className="payroll-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}

      >
        <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
          <Wallet size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <Wallet size={"15%"} strokeWidth={1} /> 13th Month pay
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Manage 13th Month pay
        </p>
      </a>
    )}
{/* 
        {!loading && permissions?.loan && (
      <a
        onClick={gotToCommission}
        className="payroll-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}

      >
        <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
          <Wallet size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <Wallet size={"15%"} strokeWidth={1} /> Commission
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Manage Employees Commission
        </p>
      </a>
    )} */}
    </div>
  );
};

export default pay_dashboard_v3;
