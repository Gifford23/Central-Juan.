// src/screens/Unauthorized.jsx
import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      {/* Card */}
      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 w-full max-w-lg sm:max-w-2xl md:max-w-3xl text-center box-border">
        
        {/* System maintenance icon / title */}
        <h2
          className="font-semibold mb-4 flex items-center justify-center gap-2 text-yellow-600"
          style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)" }}
        >
          ⚙️ System Maintenance
        </h2>

        {/* Message */}
        <p
          className="text-gray-700 mb-8 mx-auto max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed whitespace-normal break-words"
          style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
        >
          The system is currently under maintenance.  
          Please click <strong>Go Back</strong> or wait a few minutes and try again.
        </p>

        {/* Buttons */}
        <div className="flex flex-row gap-3 sm:gap-4 justify-center flex-wrap">
          <button
            onClick={() => (window.location.href = "/login")}
            className="px-5 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
