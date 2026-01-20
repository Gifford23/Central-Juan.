// src/pages/work-time-page.jsx
import React from "react";
import WorkTimeBreakTable from "./work-time-break-components/WorkTimeBreakTable";

const WorkTimePage = () => {
  // If you want to show breaks for a specific shift:
  // pass workTimeId={1} (or dynamically from URL/props).
  // If you want all mappings, just omit it.

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Work Time & Break Management</h1>

      {/* Show all mappings (global) */}
      <WorkTimeBreakTable />

      {/* Or for a specific shift: */}
      {/* <WorkTimeBreakTable workTimeId={1} /> */}
    </div>
  );
};

export default WorkTimePage;
