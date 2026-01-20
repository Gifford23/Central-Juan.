// src/components/common/ApplyChangesButton.jsx
import React from "react";
import { RefreshCcw } from "lucide-react";
import { Tooltip } from "react-tooltip";

const ApplyChangesButton = ({ onClick, disabled = false, tooltip }) => {
  return (
    <>
      <Tooltip id="apply-changes-tooltip" />
      <button
        data-tooltip-id="apply-changes-tooltip"
        data-tooltip-content={
          tooltip ||
          "Fetch updated payroll data to apply loan and contribution changes."
        }
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition hover:scale-95 employee-newheaderbuttons-solid ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <RefreshCcw className="w-5 h-5" />
        <span>Apply Changes</span>
      </button>
    </>
  );
};

export default ApplyChangesButton;
