import { ListCheck, Logs } from "lucide-react";
import { useNavigate } from "react-router-dom";

const att_dashboard_v2 = () => {
    const navigate = useNavigate(); // Get the navigate function

    const goToDTR = () => {
        console.log("Button clicked, navigating to department");
        navigate('/attendanceRecord'); // Adjust the path as needed
    };

    const goToLOG = () => {
        console.log("Button clicked, navigating to Employee 201");
        navigate('/attendance'); // Adjust the path as needed
    };

    return (
        <div className="flex flex-row items-center w-full h-full justify-evenly oveflow-hidden">
            <div className="attendance-dashboard-box nb-dashboard-bg"
                onClick={goToDTR}
            >
                <ListCheck size={"50%"} strokeWidth={1}/>
                <div className="text-xl font-bold">ATTENDANCE DTR</div>
            </div>
            <div className="attendance-dashboard-box nb-dashboard-bg"
                onClick={goToLOG}
            >
                <Logs size={"50%"} strokeWidth={1}/>
                <div className="text-xl font-bold">ATTENDANCE LOGS</div>
            </div>
        </div>
    );
}

export default att_dashboard_v2;