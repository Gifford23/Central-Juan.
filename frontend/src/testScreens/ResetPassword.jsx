import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRightCircle,
} from "lucide-react";
import BASE_URL from "../../backend/server/config";

const ResetPassword = () => {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const location = useLocation();
  const preloadedEmail = location.state?.email || "";
  const [email, setEmail] = useState(preloadedEmail);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${BASE_URL}/employeesSide/request_reset.php`, { email });
      if (res.data.success) {
        setStep(2);
        setMessage("✅ Code sent to your email.");
      } else {
        setMessage(`❌ ${res.data.message}`);
      }
    } catch {
      setMessage("❌ Failed to send reset code.");
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post(`${BASE_URL}/employeesSide/verify_code.php`, { email, code });
      if (res.data.success) {
        setVerified(true);
        setMessage("✅ Code verified. You can now set a new password.");
        setStep(3);
      } else {
        setMessage(`❌ ${res.data.message}`);
      }
    } catch {
      setMessage("❌ Failed to verify code.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("❌ Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${BASE_URL}/employeesSide/reset_password.php`, {
        email,
        code,
        newPassword,
      });

      if (res.data.success) {
        setSuccessPopup(true);
        setCountdown(5);
      } else {
        setMessage(`❌ ${res.data.message}`);
      }
    } catch {
      setMessage("❌ Failed to reset password.");
    }
    setLoading(false);
  };

  // countdown effect
  useEffect(() => {
    if (successPopup && countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (successPopup && countdown === 0) {
      window.location.href = "https://hris.centraljuan.com";
    }
  }, [successPopup, countdown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-indigo-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full flex items-center justify-center"
      >
        {/* Centered form card — made larger */}
        <div className="w-full max-w-3xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800">🔒 Reset Password</h2>
              <p className="text-sm md:text-base text-slate-500">Enter your email to get a verification code</p>
            </div>

            <div className="text-sm md:text-base text-slate-400">{step}/3</div>
          </div>

          {/* progress bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
            <div
              className={`h-full bg-gradient-to-r from-sky-600 to-indigo-600 rounded-full transition-all`}
              style={{ width: step === 1 ? "12%" : step === 2 && !verified ? "55%" : step === 3 ? "100%" : "0%" }}
            />
          </div>

          {/* Alerts */}
          {message && !successPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mb-4 p-3 rounded-lg text-sm ${message.includes("✅") ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}
            >
              {message}
            </motion.div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <label className="text-sm font-medium text-slate-700">Email address</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="w-6 h-6" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-16 pr-4 py-4 border border-sky-100 rounded-xl focus:ring-2 focus:ring-sky-300 outline-none text-base"
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-3 py-4 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-lg font-semibold shadow-md hover:opacity-95 transition"
                >
                  {loading ? "Sending..." : <>Send Code <ArrowRightCircle className="w-5 h-5" /></>}
                </button>

                <button
                  type="button"
                  onClick={() => { setEmail(""); setMessage(""); }}
                  className="w-36 py-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear
                </button>
              </div>
            </form>
          )}

          {/* STEP 2 - Verify */}
          {step === 2 && !verified && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <label className="text-sm font-medium text-slate-700">Verification code</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="w-full pl-16 pr-4 py-4 border border-sky-100 rounded-xl focus:ring-2 focus:ring-sky-300 outline-none text-base"
                  placeholder="6-digit code"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-3 py-4 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-lg font-semibold shadow-md hover:opacity-95 transition"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-36 py-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* STEP 3 - Reset */}
          {step === 3 && verified && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <label className="text-sm font-medium text-slate-700">New password</label>

              <div className="relative">
                {/* input gets extra right padding to make room for the dislocated button */}
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full pr-20 pl-4 py-4 border border-sky-100 rounded-xl focus:ring-2 focus:ring-sky-300 outline-none text-base"
                  placeholder="At least 8 characters"
                />

                {/* dislocated eye button placed outside the input's right edge */}
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 rounded-full p-2 shadow-sm text-slate-600 hover:shadow-md transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <label className="text-sm font-medium text-slate-700">Confirm password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pr-4 pl-4 py-4 border border-sky-100 rounded-xl focus:ring-2 focus:ring-sky-300 outline-none text-base"
                  placeholder="Retype new password"
                />
                {/* optional: mirror the dislocated icon for confirm field (uncomment if desired)
                <div className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 rounded-full p-2 shadow-sm text-slate-600">
                  <Eye className="w-5 h-5" />
                </div>
                */}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-3 py-4 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-lg font-semibold shadow-md hover:opacity-95 transition"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep(2); setVerified(false); }}
                  className="w-36 py-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  Back
                </button>
              </div>
            </form>
          )}


          <div className="mt-6 text-center text-sm text-slate-400">
            POWERED BY <span className="font-semibold text-slate-700">Central Juan I.T. Solutions</span>
          </div>
        </div>
      </motion.div>

      {/* Success Popup */}
      {successPopup && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 md:w-96 border border-sky-100 text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Password Reset</h3>
            <p className="text-sm text-slate-600 mb-4">Your password has been updated successfully.</p>
            <p className="text-xs text-slate-400 mb-3">Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}…</p>
            <div className="flex gap-3">
              <a
                href="https://hris.centraljuan.com"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-sm font-semibold"
              >
                Go to Login
              </a>
              <button
                className="py-2 px-3 rounded-lg border border-slate-200 text-slate-600"
                onClick={() => setSuccessPopup(false)}
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ResetPassword;
