import React from "react";
import { useNavigate } from "react-router-dom";

const WeeklyReport = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    window.location.href = "https://sharing.clickup.com/9016815620/g/h/6-901606786976-7/05c98154be612b7";
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <button
        onClick={handleRedirect}
        className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition duration-300"
      >
        Go to Weekly Report
      </button>
    </div>
  );
};

export default WeeklyReport;
