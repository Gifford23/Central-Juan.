import React, { useEffect } from 'react';

const LateRequestList = ({ lateRequests }) => {
  // Count the statuses
  const statusCounts = lateRequests.reduce((counts, request) => {
    const status = request.status || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
    counts.Total += 1;
    return counts;
  }, { Pending: 0, Approved: 0, Rejected: 0, Total: 0 });

  // You can use console.log to verify
  useEffect(() => {
    console.log('Status Counts:', statusCounts);
  }, [lateRequests]);

  return (
    <div>
      <h2 className="font-bold">Request Summary</h2>
      <p>Pending: {statusCounts.Pending}</p>
      <p>Approved: {statusCounts.Approved}</p>
      <p>Rejected: {statusCounts.Rejected}</p>
      <p>Total: {statusCounts.Total}</p>

      <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2 lg:grid-cols-3">
        {lateRequests.map((request) => (
          <LateRequestCard
            key={request.request_id}
            request={request}
            onStatusChange={() => {}}
            onCheckboxChange={() => {}}
            isChecked={false}
          />
        ))}
      </div>
    </div>
  );
};

export default LateRequestList;
