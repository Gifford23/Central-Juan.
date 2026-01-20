import React from "react";
import PagibigPage from "./pagibig/page/pagibig";
import PhilhealthPage from "./Philhealth/page/philhealth";
import SSSPage from "./SSS/page/sss";

const Contributions = () => {
  return (
    <>
    <div className='flex flex-col h-full overflow-hidden'>  
        <div className="flex flex-row w-full pb-3 pl-5 border-b-2 gap-x-2 place-items-end Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>Contributions</span>
            <span className='text-sm font-bold nb-dashboard-text-subheader'>DASHBOARD</span>
        </div>

        <div className="h-full grid grid-cols-1 grid-rows-3 gap-5 p-5">
            <div className="row-start-1 flex flex-col">
                <span className="row-start-1 text-2xl font-semibold">Pagibig</span>
                <div className="w-full h-full overflow-hidden">
                    <PagibigPage />
                </div>
            </div>
            <div className="row-start-2 flex flex-col">
                <span className="row-start-1 text-2xl font-semibold">Philhealth</span>
                <div className="w-full h-full overflow-hidden">
                    <PhilhealthPage />
                </div>
            </div>
            <div className="row-start-3 flex flex-col">
                <span className="row-start-1 text-2xl font-semibold">SSS</span>
                <div className="w-full h-full overflow-hidden">
                    <SSSPage />
                </div>
            </div>
        </div>
    
    </div>
    </>
  );
}

export default Contributions;