import { useNavigate } from "react-router-dom";
import { Banknote, PhilippinePeso } from "lucide-react";

const util_dashboard_v1 = () => {   
    const navigate = useNavigate(); // Get the navigate function
    
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
        <div className="flex flex-row items-center w-full h-full justify-evenly oveflow-hidden">
            <div className="nb-dashboard-bg utilities-dashboard-box"
                onClick={goToSalaryGrade}
            >
                <Banknote size={"45%"} strokeWidth={1}/>
                <div className="text-xl font-bold">SALARY GRADE</div>
            </div>
            <div className="nb-dashboard-bg utilities-dashboard-box"
                onClick={gotToSalaryforEmployee}
            >
                <PhilippinePeso size={"45%"} strokeWidth={1}/>
                <div className="text-xl font-bold">SALARY FOR EMPLOYEE</div>
            </div>
            <div className="nb-dashboard-bg utilities-dashboard-box"
                onClick={goToDeduction}
            >
                <Banknote size={"45%"} strokeWidth={1}/>
                <div className="text-xl font-bold">DEDUCTION</div>
            </div>
        </div>
    );
};

export default util_dashboard_v1;