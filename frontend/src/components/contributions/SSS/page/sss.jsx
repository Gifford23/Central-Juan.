import { Icon, ListCheck, Logs } from "lucide-react";
import { useNavigate } from "react-router-dom";

const   SSSPage = () => {
  const navigate = useNavigate(); // Get the navigate function

  const goToTable = () => {
      console.log("Button clicked, navigating to department");
      navigate('/SSSContributionTable'); // Adjust the path as needed
  };
  
  const goToContributions = () => {
      console.log("Button clicked, navigating to Employee 201");
      navigate('/SSSContribution'); // Adjust the path as needed
  };

  const sss = 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Social_Security_System_%28SSS%29.svg';

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
        <div className="Glc-contribution-sss-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        
        <div className="Glc-dashboard-newdesign-iconcolor absolute w-60 z-10 -bottom-3 -right-3 text-slate-200 
          group-hover:rotate-12 
          transition-transform 
          duration-300
          
          group-hover:scale-125
          " 
        >
          <img src={sss} alt="SSS"/>
        </div>

        <h3 className="Glc-dashboard-newdesign-textcolor font-medium text-lg text-slate-950 relative z-10 duration-300">
          <img src={sss} alt="SSS" className="h-10"/>
          SSS Table
        </h3>

        <p className="Glc-dashboard-newdesign-textcolor2 text-slate-400 relative z-10 duration-300">
          Manage SSS Contributions Table
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
        <div className="Glc-contribution-sss-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        
        <div className="Glc-dashboard-newdesign-iconcolor absolute w-60 z-10 -bottom-3 -right-3 text-slate-200 
          group-hover:rotate-12 
          transition-transform 
          duration-300
          
          group-hover:scale-125
          " 
        >
          <img src={sss} alt="SSS"/>
        </div>

        <h3 className="Glc-dashboard-newdesign-textcolor font-medium text-lg text-slate-950 relative z-10 duration-300">
          <img src={sss} alt="SSS" className="h-10"/>
          SSS Contributions
        </h3>

        <p className="Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-violet-200 relative z-10 duration-300">
          Manage SSS Contributions
        </p>
      </a>
      
    </div>
  );
}

export default SSSPage;