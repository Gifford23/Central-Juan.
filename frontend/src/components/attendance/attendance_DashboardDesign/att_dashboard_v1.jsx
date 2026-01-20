import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const att_dashboard_v1 = () => {
  const navigate = useNavigate(); // Get the navigate function

  const goToDTR = () => {
      console.log("Button clicked, navigating to department");
      navigate('/attendanceDTR'); // Adjust the path as needed
  };
  
  const goToLOG = () => {
      console.log("Button clicked, navigating to Employee 201");
      navigate('/attendance'); // Adjust the path as needed
  };

  return (
    <div className="flex flex-row w-full h-full gap-10 p-5 oveflow-hidden">
        <div className="flex flex-col w-full p-5 space-y-5 rounded-2xl Glc-dashboard-bg h-fill">
            <div className='flex flex-row justify-between w-full h-fit'>
                <div className="text-lg font-semibold">Attendance DTR</div>
                <button
                    onClick={goToDTR}
                    className="flex flex-row items-center cursor-pointer gap-x-1"
                >
                    <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL DTR</div>
                    <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                </button>
            </div>
        </div>

        <div className="flex flex-col w-full p-5 space-y-5 rounded-2xl Glc-dashboard-bg h-fill">
            <div className='flex flex-row justify-between w-full h-fit'>
                <div className="text-lg font-semibold">Attendance Log</div>
                <button
                    onClick={goToLOG}
                    className="flex flex-row items-center cursor-pointer gap-x-1"
                >
                    <div className="text-sm font-medium text-[#525252]/90 ">SEE ALL LOGS</div>
                    <ChevronRight size={18} strokeWidth={3} color='#525252'/>
                </button>
            </div>
        </div>
    </div>  
  );
}

export default att_dashboard_v1;