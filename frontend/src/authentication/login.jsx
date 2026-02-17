import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { Eye, EyeOff, LogIn, UserRound, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import "../../Styles/authentication/login.css";
import { useSession } from "../context/SessionContext";
import BASE_URL from "../../../backend/server/config";
import useRoles from "../authentication/useRoles";
// import Snowfall from "react-snowfall"; // Optional
import VerseOfTheDay from "./VerseOfTheDay";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useSession();
  const { roles, loading: rolesLoading } = useRoles();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (rolesLoading) return;
    setLoading(true);

    try {
      const response = await axios.post(
        `${BASE_URL}/login.php`,
        { username, password },
        { headers: { "Content-Type": "application/json" } },
      );

      if (response.data.message === "Login successful") {
        const userRole = response.data.role?.toUpperCase();
        const actualFullName =
          response.data.full_name || response.data.username;

        const userObject = {
          user_id: response.data.user_id,
          username: response.data.username,
          full_name: response.data.full_name,
          role: userRole,
          status: response.data.status,
          isLoggedIn: true,
        };

        if (remember) localStorage.setItem("user", JSON.stringify(userObject));
        setUser(userObject);

        Swal.fire({
          icon: "success",
          title: "Welcome!",
          text: `Hello, ${actualFullName}!`,
          timer: 1500,
          showConfirmButton: false,
        });

        const employeeRoles = roles
          .filter((r) => r.role_name.toUpperCase() === "EMPLOYEE")
          .map((r) => r.role_name.toUpperCase());
        const adminRoles = roles
          .filter((r) => r.role_name.toUpperCase() !== "EMPLOYEE")
          .map((r) => r.role_name.toUpperCase());

        setTimeout(() => {
          if (employeeRoles.includes(userRole)) navigate("/employee/dashboard");
          else if (adminRoles.includes(userRole)) navigate("/dashboard");
          else navigate("/unauthorized");
        }, 1400);
      } else {
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: response.data.message || "Invalid username or password",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      Swal.fire({
        icon: "warning",
        title: "Server Issue",
        text: "Hostinger might be under high load. Please check their status page.",
        footer: `<a href="https://status.hostinger.com" target="_blank" rel="noopener" class="text-indigo-600 underline font-semibold">Check Hostinger Status</a>`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (rolesLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading roles...
      </div>
    );

  return (
    // FIX 1: Changed md:flex-row to lg:flex-row
    <div className="min-h-screen flex flex-col lg:flex-row bg-linear-to-br from-sky-100 via-white to-sky-200 overflow-hidden">
      {/* --- LEFT PANEL (Desktop Only) --- */}
      {/* FIX 2: Changed hidden md:flex to hidden lg:flex */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 h-screen"
      >
        <div className="max-w-md text-center">
          <img
            src="/systemImage/HorizonHR-logoPC.png"
            alt="HorizonHR"
            className="mx-auto w-100 drop-shadow-2xl"
          />
        </div>

        {/* Verse of the Day - Positioned Absolute Bottom */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center w-full px-8">
          <VerseOfTheDay />
        </div>
      </motion.div>

      {/* --- RIGHT PANEL (Login Form) --- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full lg:w-1/2 items-center justify-center p-6 min-h-screen relative z-10"
      >
        <div className="w-full flex flex-col items-center max-w-lg">
          <div className="w-full bg-white shadow-2xl rounded-2xl p-8 border border-gray-100">
            <div className="flex flex-col items-center text-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                <UserRound className="w-10 h-10 text-sky-600" />
              </div>

              <h1 className="text-2xl font-bold text-slate-800">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500">
                Sign in to continue to Horizon HR
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                User ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  aria-label="username"
                  type="text"
                  placeholder="CJIS-XXX-XXXX"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                  required
                />
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  aria-label="password"
                  type={passwordVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                  required
                />

                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  aria-label={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-600"
                >
                  {passwordVisible ? <EyeOff /> : <Eye />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm"></label>

                <button
                  type="button"
                  className="text-sm text-sky-600 hover:underline"
                  onClick={() => navigate("/reset-password")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-lg bg-linear-to-r from-sky-600 to-indigo-600 text-white font-semibold shadow-md hover:scale-[1.01] transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign in</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              POWERED BY{" "}
              <a
                href="https://about.centraljuan.com"
                className="font-semibold text-slate-700 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Central Juan I.T. Solutions
              </a>
            </div>
          </div>

          {/* FIX 3: Ensure this is only visible when lg flex is NOT active */}
          <div className="lg:hidden mt-8 w-full mb-6">
            <VerseOfTheDay />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
