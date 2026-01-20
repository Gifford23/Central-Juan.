// BreakTimePage.jsx
import React from "react";
import BreakTimeTable from "./componets/BreakTimeTable";

const BreakTimePage = () => {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Break Time Management</h1>
      <BreakTimeTable />
    </div>
  );
};

export default BreakTimePage;
