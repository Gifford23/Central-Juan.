// src/components/RequestIconWithBadge.jsx
import { FileClock } from 'lucide-react';
import { useLateRequests } from '../../admin_Late_request/hooks/uselateRequestAdmin'; 
import { useEffect, useState } from 'react';
import BASE_URL from '../../../../backend/server/config';

const RequestIconWithBadge = () => {
  const { lateRequests } = useLateRequests();
  const [overtimePending, setOvertimePending] = useState(0);

  useEffect(() => {
    const fetchOvertime = async () => {
      try {
        const response = await fetch(`${BASE_URL}/overtime/overtime_request.php`);
        const data = await response.json();
        if (data.success) {
          const pendingCount = data.data.filter(r => r.status === 'Pending').length;
          setOvertimePending(pendingCount);
        }
      } catch (err) {
        console.error('Failed to fetch overtime data:', err);
      }
    };

    fetchOvertime();
  }, []);

  const latePending = lateRequests.filter(r => r.status === 'pending').length;
  const totalPending = latePending + overtimePending;

  return (
    <div className="relative">
      <FileClock size={18} strokeWidth={3} />
      {totalPending > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
          {totalPending > 9 ? '9+' : totalPending}
        </span>
      )}
    </div>
  );
};

export default RequestIconWithBadge;
