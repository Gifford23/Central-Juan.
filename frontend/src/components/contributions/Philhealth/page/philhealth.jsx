import { Icon, ListCheck, Logs } from "lucide-react";
import { useNavigate } from "react-router-dom";

const   PhilhealthPage = () => {
  const navigate = useNavigate(); // Get the navigate function

  const goToTable = () => {
      console.log("Button clicked, navigating to department");
      navigate('/PhilhealthContributionTable'); // Adjust the path as needed
  };
  
  const goToContributions = () => {
      console.log("Button clicked, navigating to Employee 201");
      navigate('/PhilhealthContribution'); // Adjust the path as needed
  };

  const philhealth = 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Philippine_Health_Insurance_Corporation_%28PhilHealth%29.svg';

  return (
    <div className="flex flex-row items-center w-full h-full justify-evenly oveflow-hidden gap-x-10 p-7">
      
      <a onClick={goToTable} 
        className=" nb-dashboard-bg group
          transition 
          cursor-pointer
          rounded-4xl 
          w-full h-full
          p-5 shadow
          border-[1px] 
          border-slate-300 
          relative 
          overflow-hidden 
          
          hover:ease-in-out 
          hover:scale-105 
          hover:duration-300 
          hover:shadow-lg
        ">
        <div className="Glc-contribution-philhealth-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        
        <div className="Glc-dashboard-newdesign-iconcolor absolute w-70 z-10 bottom-3 right-3 text-slate-200 
          group-hover:rotate-12 
          transition-transform 
          duration-300
          
          group-hover:scale-125" 
        >
          <img src={philhealth} alt="Philhealth"/>
        </div>

        <h3 className="Glc-dashboard-newdesign-textcolor font-medium text-lg text-slate-950 relative z-10 duration-300">
          <img src={philhealth} alt="Philhealth" className="h-10"/>
          Philhealth Table
        </h3>
        
        <p className="text-slate-400 group-hover:text-[#03750D] relative z-10 duration-300">
          Manage Philhealth Contributions Table
        </p>
      </a>

      <a onClick={goToContributions} 
        className=" nb-dashboard-bg group
          transition 
          cursor-pointer
          rounded-4xl 
          w-full h-full
          p-5 shadow
          border-[1px] 
          border-slate-300 
          relative 
          overflow-hidden 
          
          hover:ease-in-out 
          hover:scale-105 
          hover:duration-300 
          hover:shadow-lg
        ">
        <div className="Glc-contribution-philhealth-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        
        <div className="Glc-dashboard-newdesign-iconcolor absolute w-70 z-10 bottom-3 right-3 text-slate-200 
          group-hover:rotate-12 
          transition-transform 
          duration-300
          
          group-hover:scale-125" 
        >
          <img src={philhealth} alt="Philhealth"/>
        </div>

        <h3 className="Glc-dashboard-newdesign-textcolor font-medium text-lg text-slate-950 relative z-10 duration-300">
          <img src={philhealth} alt="Philhealth" className="h-10"/>
          Philhealth Contributions
        </h3>

        <p className="text-slate-400 group-hover:text-[#03750D] relative z-10 duration-300">
          Manage Philhealth Contributions
        </p>
      </a>
      
    </div>
  );
}

export default PhilhealthPage;