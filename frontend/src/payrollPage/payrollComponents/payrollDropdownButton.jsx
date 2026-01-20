import { ChevronDown } from 'lucide-react';
import usePermissions from "../../users/hooks/usePermissions";
import { useSession } from "../../context/SessionContext";

export default function PayrollDropdownButton({ onToggle, payrollId }) {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username); 

  return (
    <div>
    {!permLoading && permissions?.can_view && (
      <button
        onClick={() => onToggle(payrollId)}
        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        View Details
        <ChevronDown className="w-4 h-4" />
      </button>
    )}
    </div>
  );
}
