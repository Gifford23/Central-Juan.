import { useNavigate } from "react-router-dom";
import "../../../Styles/components/utilities/utilities.css";
import Design_v1 from "./utilities_DashboardDesign/util_dashboard_v1";
import Design_v2 from "./utilities_DashboardDesign/util_dashboard_v2";

const Utilities = () => {

    const navigate = useNavigate(); // Get the navigate function

    const goToSalaryGrade = () => {
        console.log("Navigating to Salary Grades");
        navigate('/salaryGrades');
    };
    
    const goToSalaryForEmployee = () => {
        console.log("Navigating to Salary for Employee");
        navigate('/salary_for_employee');
    };

    const goToDeduction = () => {
        console.log("Navigating to Deduction");
        navigate('/deduction');
    };

    return (
        <div className='flex flex-col h-full overflow-hidden'>
            <div className="flex flex-row w-full pb-3 pl-5 border-b-2 gap-x-2 place-items-end Glc-dashboard-bg-header">
                <span className='text-2xl font-semibold'>Settings</span>
                <span className='text-sm font-bold nb-dashboard-text-subheader'>DASHBOARD</span>
            </div>

            {/* Design 1: simple hover to box icon */}
            {/* <Design_v1 /> */}

            {/* Design 2: hover animation to box icon */}
            <Design_v2 />
        </div>
    );
};

export default Utilities;
