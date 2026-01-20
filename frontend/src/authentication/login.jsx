import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Eye,
  EyeOff,
  LogIn,
  UserRound,
  Mail,
  Lock,
  KeyRound,
} from "lucide-react";
import { motion } from "framer-motion";
import "../../Styles/authentication/login.css";
import { useSession } from "../context/SessionContext";
import BASE_URL from "@backend/config";
import useRoles from "../authentication/useRoles";
import Snowfall from "react-snowfall";

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

        // Decide route based on role
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
        footer: `<a href=\"https://status.hostinger.com\" target=\"_blank\" rel=\"noopener\" class=\"text-indigo-600 underline font-semibold\">Check Hostinger Status</a>`,
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-sky-100 via-white to-sky-200">
      {/* LEFT - Branding / illustration */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden md:flex md:w-1/2 items-center justify-center p-12"
      >
        <div className="max-w-md text-center">
          <img
            src="/systemImage/HorizonHR-logoPC.png"
            alt="HorizonHR"
            className="mx-auto w-100 drop-shadow-2xl"
          />
          {/* <h2 className="mt-6 text-3xl font-extrabold text-sky-700">Horizon HR Management</h2> */}
          {/* <p className="mt-3 text-slate-600">Secure access for employees and administrators — neat, fast, and mobile-friendly.</p> */}

          {/* <div className="mt-8 flex gap-3 justify-center">
            <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40">
              <p className="text-sm font-medium">Secure</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 backdrop-blurPOWERED BY-sm border border-white/40">
              <p className="text-sm font-medium">Fast</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/40">
              <p className="text-sm font-medium">Responsive</p>
            </div>
          </div> */}
        </div>
      </motion.div>

      {/* RIGHT - Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full md:w-1/2 items-center justify-center p-6 min-h-screen"
      >
        <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl p-8 border border-gray-100">
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
              <UserRound className="w-10 h-10 text-sky-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-800">Welcome back</h1>
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
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-600"
              >
                {passwordVisible ? <EyeOff /> : <Eye />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-sm">
                {/* <input type="checkbox" checked={remember} onChange={() => setRemember(!remember)} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" /> */}
                {/* <span className="text-slate-600">Remember me</span> */}
              </label>

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
              className="w-full inline-flex items-center justify-center gap-3 py-3 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-semibold shadow-md hover:scale-[1.01] transition disabled:opacity-70 disabled:cursor-not-allowed"
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

            {/* <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <div className="text-sm text-gray-400">Or continue with</div>
              <div className="flex-1 h-px bg-gray-200" />
            </div> */}

            {/* <div className="flex gap-3">
              <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 hover:shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22 12.07c0-.7-.06-1.38-.18-2.03H12v3.84h5.45c-.23 1.26-.94 2.33-2 3.05v2.53h3.23c1.88-1.73 2.97-4.28 2.97-7.39z" fill="#4285F4" />
                  <path d="M12 23c2.7 0 4.98-.9 6.64-2.44l-3.23-2.53c-.9.6-2.06.95-3.41.95-2.62 0-4.84-1.77-5.63-4.15H2.98v2.6C4.63 20.85 8.02 23 12 23z" fill="#34A853" />
                  <path d="M6.37 14.83A7.24 7.24 0 016 12c0-.9.16-1.77.45-2.58V6.81H2.98A11 11 0 001 12c0 1.76.42 3.41 1.15 4.86l4.22-2.03z" fill="#FBBC05" />
                  <path d="M12 5.5c1.48 0 2.82.51 3.87 1.52l2.91-2.91C16.98 2.6 14.7 1.5 12 1.5 8.02 1.5 4.63 3.65 2.98 6.81l4.63 3.69C7.16 7.27 9.38 5.5 12 5.5z" fill="#EA4335" />
                </svg>
                Google
              </button>

              <button type="button" className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 hover:shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10z" fill="#1877F2"/>
                  <path d="M15 12.5h-1.5V16h-2.5v-3.5H9V10h2V8.5c0-1.4.9-3.5 3.5-3.5 1 0 1.8.1 2 .1v2.3h-1.3c-1 0-1.2.5-1.2 1.2V10h2.5l-.4 2.5z" fill="#fff"/>
                </svg>
                Facebook
              </button>
            </div> */}

            {/* <div className="text-center text-xs text-gray-400">By signing in you agree to our <button type="button" className="underline">Terms</button> and <button type="button" className="underline">Privacy</button>.</div> */}
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
      </motion.div>
    </div>
  );
}
