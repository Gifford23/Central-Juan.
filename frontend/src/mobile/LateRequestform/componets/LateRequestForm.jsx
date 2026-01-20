import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import useLateRequest from "../hooks/useLateRequest";

const LateRequestForm = () => {
  const location = useLocation();
  const { employeeName = "Unknown Employee", employeeId } = location.state || {};

  const {
    attendanceDate,
    setAttendanceDate,
    requestedTimeInMorning,
    setRequestedTimeInMorning,
    requestedTimeOutMorning,
    setRequestedTimeOutMorning,
    requestedTimeInAfternoon,
    setRequestedTimeInAfternoon,
    requestedTimeOutAfternoon,
    setRequestedTimeOutAfternoon,
    reason,
    setReason,
    loading: submitLoading,
    handleSubmit,
  } = useLateRequest(employeeId, employeeName);

  const [disableFields, setDisableFields] = useState({
    inMorning: false,
    outMorning: false,
    inAfternoon: false,
    outAfternoon: false,
    all: false,
  });
  const [dateLoading, setDateLoading] = useState(false);

  useEffect(() => {
    setDateLoading(true);
    const timeout = setTimeout(() => {
      const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

      if (attendanceDate > todayStr) {
        setDisableFields({ inMorning: true, outMorning: true, inAfternoon: true, outAfternoon: true, all: true });
      } else if (attendanceDate < todayStr) {
        setDisableFields({ inMorning: false, outMorning: false, inAfternoon: false, outAfternoon: false, all: false });
      } else {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        setDisableFields({
          inMorning: false,
          outMorning: !((hour === 12 && minute >= 10) || hour >= 13),
          inAfternoon: !((hour === 12 && minute >= 30) || hour >= 14),
          outAfternoon: !(hour >= 18 && minute >= 5),
          all: false,
        });
      }
      setDateLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [attendanceDate]);

  const isFormDisabled = dateLoading || submitLoading || disableFields.all;

  const getBorderColor = (disabled) => {
    return disabled ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50 focus:ring-green-200";
  };

  return (
    <div className="flex justify-center min-h-full bg-gray-50 pb-12">
      <div className="w-full p-8 space-y-6 bg-white border border-gray-200 shadow-lg rounded-2xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-800">Late Attendance Request</h2>
          {dateLoading && (
            <p className="text-sm text-blue-600">Loading date data...</p>
          )}
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <p><span className="font-medium">Employee ID:</span> {employeeId}</p>
          <p><span className="font-medium">Employee Name:</span> {employeeName}</p>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Attendance Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-100"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            disabled={submitLoading}
          />
        </div>

        <div className="space-y-4">
          {/* Morning Row */}
          <div className="flex flex-row gap-4">
            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Time In (Morning)</label>
              <input
                type="time"
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring ${getBorderColor(isFormDisabled || disableFields.inMorning)}`}
                value={requestedTimeInMorning}
                onChange={(e) => setRequestedTimeInMorning(e.target.value)}
                disabled={isFormDisabled || disableFields.inMorning}
              />
            </div>

            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Time Out (Morning)</label>
              <input
                type="time"
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring ${getBorderColor(isFormDisabled || disableFields.outMorning)}`}
                value={requestedTimeOutMorning}
                onChange={(e) => setRequestedTimeOutMorning(e.target.value)}
                disabled={isFormDisabled || disableFields.outMorning}
              />
            </div>
          </div>

          {/* Afternoon Row */}
          <div className="flex flex-row gap-4">
            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Time In (Afternoon)</label>
              <input
                type="time"
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring ${getBorderColor(isFormDisabled || disableFields.inAfternoon)}`}
                value={requestedTimeInAfternoon}
                onChange={(e) => setRequestedTimeInAfternoon(e.target.value)}
                disabled={isFormDisabled || disableFields.inAfternoon}
              />
            </div>

            <div className="w-1/2">
              <label className="block mb-1 text-sm font-medium text-gray-700">Time Out (Afternoon)</label>
              <input
                type="time"
                className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring ${getBorderColor(isFormDisabled || disableFields.outAfternoon)}`}
                value={requestedTimeOutAfternoon}
                onChange={(e) => setRequestedTimeOutAfternoon(e.target.value)}
                disabled={isFormDisabled || disableFields.outAfternoon}
              />
            </div>
          </div>
        </div>


        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Reason</label>
          <textarea
            className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring focus:ring-blue-100"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isFormDisabled}
            rows={4}
          ></textarea>
        </div>

        <button
          className={`w-full py-2 px-4 rounded-lg text-white font-semibold transition duration-200 ${
            isFormDisabled
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={handleSubmit}
          disabled={isFormDisabled}
        >
          {submitLoading ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </div>
  );
};

export default LateRequestForm;
