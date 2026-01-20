import { useNavigate } from "react-router-dom";
import { Banknote, HandCoins } from "lucide-react";

const pay_dashboard_v2 = () => {   
    const navigate = useNavigate(); // Get the navigate function

    const goToRecords = () => {
        console.log("Button clicked, navigating to department");
        navigate('/payroll'); // Adjust the path as needed
    };
    
    
    const goToBaseSalary = () => {
        console.log("Button clicked, navigating to Employee 201");
        navigate('/baseSalary'); // Adjust the path as needed
    };

    return (
        <div className="flex flex-row items-center w-full h-full justify-evenly oveflow-hidden">
            <div className="nb-dashboard-bg payroll-dashboard-box"
                onClick={goToRecords}
            >
                <HandCoins size={"45%"} strokeWidth={1}/>
                <div className="text-xl font-bold">PAYROLL RECORDS</div>
            </div>
            <div className="nb-dashboard-bg payroll-dashboard-box"
                onClick={goToBaseSalary}
            >
                <Banknote size={"45%"} strokeWidth={1}/>
                <div className="text-xl font-bold">BASE SALARY</div>
            </div>
        </div>
    );
};

export default pay_dashboard_v2;