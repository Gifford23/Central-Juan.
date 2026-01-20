import { Icon, ListCheck, Logs } from "lucide-react";
import { useNavigate } from "react-router-dom";

const   PagibigPage = () => {
  const navigate = useNavigate(); // Get the navigate function

  const goToTable = () => {
      console.log("Button clicked, navigating to department");
      navigate('/PagibigContributionTable'); // Adjust the path as needed
  };
  
  const goToContributions = () => {
      console.log("Button clicked, navigating to Employee 201");
      navigate('/pagibigContribution'); // Adjust the path as needed
  };

  const pagibig = 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Pag-IBIG.svg';


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
        <div className="Glc-contribution-pagibig-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        
        <div className="Glc-dashboard-newdesign-iconcolor absolute w-50 z-10 -bottom-3 -right-3 text-slate-200 
          group-hover:rotate-12 
          transition-transform 
          duration-300
          
          group-hover:scale-125" 
        >
          <img src={pagibig} alt="pagibig"/>
        </div>

        <h3 className="Glc-dashboard-newdesign-textcolor font-medium text-lg text-slate-950 relative z-10 duration-300">
          <img src={pagibig} alt="pagibig" className="h-13"/>
          Pagibig Table
        </h3>

        <p className="Glc-dashboard-newdesign-textcolor2 text-slate-400 relative z-10 duration-300">
          Manage Pagibig Contributions Table
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
        <div className="Glc-contribution-pagibig-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
        
       <div className="Glc-dashboard-newdesign-iconcolor absolute w-50 z-10 -bottom-3 -right-3 text-slate-200 
          group-hover:rotate-12 
          transition-transform 
          duration-300
          
          group-hover:scale-125" 
        >
          <img src={pagibig} alt="Pagibig"/>
        </div>

        <h3 className="Glc-dashboard-newdesign-textcolor font-medium text-lg text-slate-950 relative z-10 duration-300">
          <img src={pagibig} alt="pagibig" className="h-13"/>
          Pagibig Contributions
        </h3>

        <p className="Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-violet-200 relative z-10 duration-300">
          Manage Pagibig Contributions
        </p>
      </a>
      
    </div>
  );
}

export default PagibigPage;