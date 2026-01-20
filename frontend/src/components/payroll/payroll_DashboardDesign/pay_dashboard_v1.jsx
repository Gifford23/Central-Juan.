import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";  

const pay_dashboard_v1 = () => {   
    const navigate = useNavigate(); // Get the navigate function

    const goToRecords = () => {
        console.log("Button clicked, navigating to department");
        navigate('/payroll'); // Adjust the path as needed
    };
    
    
    const goToBaseSalary = () => {
        console.log("Button clicked, navigating to Employee 201");
        navigate('/baseSalary'); // Adjust the path as needed
    };

    const goToSalaryGrade = () => {
        console.log("Button clicked, navigating to Employee 201");
        navigate('/salaryGrades'); // Adjust the path as needed
    };
    
    const gotToSalaryforEmployee = () => {
        console.log("Button clicked, navigating to Employee 201");
        navigate('/salary_for_employee'); // Adjust the path as needed
    };

    const goToDeduction = () => {
        console.log("Button clicked, navigating to Employee 201");
        navigate('/deduction'); // Adjust the path as needed
    };

    return (
        <div className="flex flex-col w-full h-full gap-10 p-5 oveflow-hidden">
            <div className='flex flex-row w-full h-full gap-10'>
                <div className="w-full h-full p-5 space-y-5 rounded-2xl Glc-dashboard-bg">
                    <div className='flex flex-row justify-between w-full h-fit'>
                        <div className="text-lg font-semibold">Payroll Records</div>
                        <button
                            onClick={goToRecords}
                            className="flex flex-row items-center cursor-pointer gap-x-1"
                        >
                            <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL PAYROLL RECORDS</div>
                            <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                        </button>
                    </div>
                </div>

                <div className="w-full h-full p-5 rounded-2xl Glc-dashboard-bg">
                    <div className='flex flex-row justify-between w-full h-fit'>
                        <div className="text-lg font-semibold">Base Salary</div>
                        <button
                            onClick={goToBaseSalary}
                            className="flex flex-row items-center cursor-pointer gap-x-1"
                        >
                            <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL BASE SALARY</div>
                            <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                        </button>
                    </div>
                </div>

                <div className="w-full h-full p-5 rounded-2xl Glc-dashboard-bg">
                    <div className='flex flex-row justify-between w-full h-fit'>
                        <div className="text-lg font-semibold">Salary Grade</div>
                        <button
                            onClick={goToSalaryGrade}
                            className="flex flex-row items-center cursor-pointer gap-x-1"
                        >
                            <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL SALARY GRADES</div>
                            <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                        </button>
                    </div>
                </div>
            </div>
            
            <div className='flex flex-row w-full h-full gap-10'>
                <div className="w-full h-full p-5 space-y-5 rounded-2xl Glc-dashboard-bg">
                    <div className='flex flex-row justify-between w-full h-fit'>
                        <div className="text-lg font-semibold">Salary for Employee</div>
                        <button
                            onClick={gotToSalaryforEmployee}
                            className="flex flex-row items-center cursor-pointer gap-x-1"
                        >
                            <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL SALARY FOR EMPLOYEE</div>
                            <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                        </button>
                    </div>
                </div>

                <div className="w-full h-full p-5 rounded-2xl Glc-dashboard-bg">
                    <div className='flex flex-row justify-between w-full h-fit'>
                        <div className="text-lg font-semibold">Deduction</div>
                        <button
                            onClick={goToDeduction}
                            className="flex flex-row items-center cursor-pointer gap-x-1"
                        >
                            <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL DEDUCTION</div>
                            <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default pay_dashboard_v1;