import '../../../Styles/components/payroll/payrollDashboard.css'
import Design_v1 from './payroll_DashboardDesign/pay_dashboard_v1';
import Design_v2 from './payroll_DashboardDesign/pay_dashboard_v2';
import Design_v3 from './payroll_DashboardDesign/pay_dashboard_v3';



const PayrollDashoard = () => {

    return (
        <>
        <div className='flex flex-col h-full overflow-hidden'>

            <div className="flex flex-row w-full pb-3 pl-5 border-b-2 gap-x-2 place-items-end Glc-dashboard-bg-header">
                <span className='text-2xl font-semibold'>Payroll</span>
                <span className='text-sm font-bold nb-dashboard-text-subheader'>DASHBOARD</span>
            </div>

            {/* Design 1: with summary overview for each pages */}
            {/* <Design_v1 /> */}
            
            {/* Design 2: simple hover to box icon */}
            {/* <Design_v2 /> */}

            {/* Design 3: hover animation to box icon */}
            <Design_v3 />
            
        </div>
        </>
    );
};

export default PayrollDashoard;