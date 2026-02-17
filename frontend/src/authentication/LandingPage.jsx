import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import FeaturesSection from "../authentication/FeaturesSection";
import HeroChecklist from "../authentication/HeroChecklist"; // Update path if needed
// Make sure this file path is correct in your project
import heroImg from "../assets/hero12.png";

import {
  Users,
  Clock,
  CreditCard,
  CalendarCheck,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  BarChart3,
  CheckCircle,
  Menu,
  X,
  Facebook,
  Linkedin,
  Mail,
} from "lucide-react";

// Custom Viber Icon Component
const ViberIcon = ({ size = 24, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    <path d="M14.05 2a9 9 0 0 1 8 7.94" />
    <path d="M14.05 6A5 5 0 0 1 18 10" />
  </svg>
);

ViberIcon.propTypes = {
  size: PropTypes.number,
  className: PropTypes.string,
};

// --- CONFIGURATION ---
const LOGO_PATH = "/systemImage/HorizonHR-logoPC.png"; // Ensure this matches your public folder
const BRAND_NAME = "Horizon HR";

// --- ANIMATION VARIANTS ---
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll handler
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-dvh max-w-[100vw] bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-sky-200 selection:text-sky-900">
      {" "}
      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="flex justify-between items-center h-14 sm:h-16 lg:h-20
"
          >
            {/* Logo */}
            <div
              className="flex-shrink-0 cursor-pointer group"
              onClick={() => window.scrollTo(0, 0)}
            >
              <img
                src={LOGO_PATH}
                alt={BRAND_NAME}
                className="h-10 lg:h-15 w-auto object-contain transition-all duration-300 group-hover:scale-105"
              />
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center space-x-1">
              <div className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-slate-50/50 border border-slate-200/30">
                <button
                  onClick={() => scrollToSection("features")}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-orange-500 hover:bg-white/50 rounded-md transition-all duration-200"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("benefits")}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-orange-500 hover:bg-white/50 rounded-md transition-all duration-200"
                >
                  Benefits
                </button>
                <button
                  onClick={() => scrollToSection("core-capabilities")}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-orange-500 hover:bg-white/50 rounded-md transition-all duration-200"
                >
                  Solutions
                </button>
              </div>

              <div className="w-px h-8 bg-slate-200 mx-2"></div>

              <button
                onClick={() => navigate("/login")}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-sm font-semibold shadow-lg shadow-slate-200/50 hover:from-orange-500 hover:to-orange-600 hover:shadow-orange-200/50 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 border border-slate-800/20"
              >
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform duration-300"
                />
                Access Portal
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="lg:hidden bg-white/95 backdrop-blur-lg border-t border-slate-100 px-4 py-6 space-y-2 shadow-2xl"
          >
            <div className="space-y-1">
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-orange-500 rounded-lg transition-all duration-200"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("benefits")}
                className="block w-full text-left px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-orange-500 rounded-lg transition-all duration-200"
              >
                Benefits
              </button>
              <button
                onClick={() => scrollToSection("core-capabilities")}
                className="block w-full text-left px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 hover:text-orange-500 rounded-lg transition-all duration-200"
              >
                Solutions
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => navigate("/login")}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white font-bold text-center shadow-lg hover:from-orange-500 hover:to-orange-600 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ArrowRight size={16} />
                Access Portal
              </button>
            </div>
          </motion.div>
        )}
      </nav>
      {/* ==================== CLEAN HERO SECTION ==================== */}
      <section className="relative pt-20 sm:pt-24 lg:pt-40 pb-14 sm:pb-16 lg:pb-32 overflow-hidden bg-slate-50">
        {" "}
        {/* --- Background Elements (Subtle & locked in place) --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Giant Watermark Text - Centered and Faint */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
            <span className="text-[5rem] sm:text-[10rem] lg:text-[20rem] font-black text-slate-100/60 uppercase tracking-widest whitespace-nowrap">
              {" "}
              HR IS
            </span>
          </div>

          {/* Decorative Blobs */}
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-100/40 rounded-full blur-[100px] -z-10" />
        </div>
        {/* --- Main Content Container --- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* 1. LEFT COLUMN: Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  #1 HR Solution in the Philippines
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900 tracking-tight leading-[1.1]">
                {" "}
                Horizon HR <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-600 to-amber-500">
                  Information System.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl sm:max-w-2xl mx-auto lg:mx-0">
                Streamline processes, eliminate calculation errors, and foster a
                better workplace <br />
                culture with our all-in-one HR platform customized for you.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => navigate("/login")}
                  className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-200 hover:bg-orange-600 hover:scale-[1.02] transition-all duration-300 w-full sm:w-auto"
                >
                  Get Started
                </button>
                <button
                  onClick={() => scrollToSection("features")}
                  className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all w-full sm:w-auto"
                >
                  View Features
                </button>
              </div>

              {/* Trust Badges / Company Logos */}
              <div className="pt-4 flex items-center justify-center lg:justify-start gap-4">
                <div className="flex -space-x-3">
                  {[
                    "https://scontent.fcgy3-2.fna.fbcdn.net/v/t39.30808-6/358691447_692784409528936_7009358563583588114_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHajJjFs8HANLLMzgwsa0CCKSnCVaMUw3gpKcJVoxTDeBmuu2aGSJzociLiRHlZOAVnVFk7z2Eot4RFHk8U2Z4u&_nc_ohc=lNY8GCvAdgcQ7kNvwEQL81W&_nc_oc=AdmqsE2zqPLprzFF2HEAVsFiLx0z4DMZvSmt45Vurogye8fjGMuKP6LRqww6MXhtRCs&_nc_zt=23&_nc_ht=scontent.fcgy3-2.fna&_nc_gid=eLq8xi_f6m9QVQI5eMRA9g&oh=00_AfuyyWEOSX5Ikftp6XeJZaKFnX8S-ezCDFzMPi_-t7aiNg&oe=6997B96D",
                    "https://scontent.fcgy3-2.fna.fbcdn.net/v/t39.30808-6/557602493_3648198222141756_292945731412478362_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeH1GJHZP6z1OboucJwn3a2hSJkq7Q0_Vs5ImSrtDT9WzvmKx8tlHHc2L65yLDDe8yRq362YC6Mqv0ZP4zgXTfpL&_nc_ohc=x4QrsxCYg9oQ7kNvwGAH9zW&_nc_oc=AdlA6rZ77BmU3ff3YBjwbpUTZVdjg44aT7qXAV_OhEsv9yxPCLtVtkLj4h-fYJViOKQ&_nc_zt=23&_nc_ht=scontent.fcgy3-2.fna&_nc_gid=U85cIEQomS7UmbbnrzdQNA&oh=00_AfvWP02k5dqtVx8LWwHhVoYuMOk_7RlmMI6E26vBaGDZJQ&oe=6997B500",
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbiO5cP0ehhlc8dyJxX40TVgZyH7fzn8UZhw&s",
                    "https://d3up48wss6lvj.cloudfront.net/data/uploads/2021/09/bigbys.png",
                  ].map((logoUrl, i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-white bg-white overflow-hidden shadow-sm"
                    >
                      <img
                        src={logoUrl}
                        alt={`Company ${i + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=Company${
                            i + 1
                          }&background=random&color=fff`;
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-sm font-medium text-slate-500">
                  Trusted by{" "}
                  <span className="text-slate-900 font-bold">200+</span>{" "}
                  companies
                </div>
              </div>
            </motion.div>

            {/* 2. RIGHT COLUMN: Image / Visual (Pop-Out Effect) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative lg:h-[600px] flex items-center justify-center"
            >
              {/* Sizing Container: This sets the boundaries for the visual */}
              <div className="relative w-[260px] h-[260px] xs:w-[300px] xs:h-[300px] sm:w-[380px] sm:h-[380px] lg:w-[480px] lg:h-[480px] flex items-end justify-center">
                {/* Spinning Rings (Larger than the main circle) */}
                <div className="absolute -inset-12 rounded-full border border-orange-200/40 animate-[spin_20s_linear_infinite]" />
                <div className="absolute -inset-4 rounded-full border border-orange-300/30 animate-[spin_15s_linear_infinite_reverse]" />

                {/* --- MAIN SOLID CIRCLE BACKGROUND --- */}
                {/* UPDATED: 'inset-0' makes it fill the container exactly.
                    'bg-gradient-to-tr' creates the orange gradient you requested. */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 shadow-2xl shadow-orange-500/30 border-[6px] border-white/30"></div>

                {/* --- THE PERSON (Pop Out) --- */}
                {/* UPDATED: 
                    - 'bottom-0' forces the image base to sit exactly at the circle's bottom edge.
                    - 'h-[115%]' allows the head to pop out the top.
                */}
                <img
                  src={heroImg}
                  alt="HR Manager"
                  className="relative z-10 h-[120%] w-auto object-contain object-bottom drop-shadow-2xl"
                />
                {/* ☁️ Cloudy White Gradient Overlay */}
                <div className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none">
                  <div className="absolute bottom-0 left-0 w-full h-[14%] bg-linear-to-t from-white/70 via-white/40 to-transparent blur-[2px]" />
                </div>

                {/* Floating Card */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-6 sm:bottom-10 -left-2 sm:-left-6 md:-left-10 z-20 bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">
                        Efficiency Rate
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        +90% Productivity
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          <HeroChecklist />
        </div>
      </section>
      {/* ==================== FEATURES SECTION (IMPORTED) ==================== */}
      <FeaturesSection />
      {/* ==================== FEATURES GRID ==================== */}
      <section
        id="features"
        className="py-16 sm:py-20 lg:py-28 bg-gradient-to-br from-white via-slate-50 to-white relative overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-orange-100/30 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-sky-100/20 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <span className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-xs font-bold text-orange-600 tracking-wide uppercase shadow-sm">
              Platform Features
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
              Human Resources{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                Modules
              </span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Everything you need to manage your workforce efficiently
              thoughtfully designed, <br></br> secure, and easy to scale as your
              organization grows.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* We map through this array to render cards. 
                'BgIcon' is the icon component we want in the background.
            */}
            {[
              {
                index: "01",
                title: "Automated Payroll",
                desc: "Generate accurate payslips instantly. Handles deductions, overtime, and allowances automatically.",
                icon: <CreditCard className="w-6 h-6 text-white" />,
                BgIcon: CreditCard, // <--- Thematic Background
                color: "bg-blue-600",
              },
              {
                index: "02",
                title: "Smart Attendance",
                desc: "Biometric integration for real-time logs. Track lates, undertime, and absences effortlessly.",
                icon: <Clock className="w-6 h-6 text-white" />,
                BgIcon: Clock, // <--- Thematic Background
                color: "bg-indigo-600",
              },
              {
                index: "03",
                title: "Digital 201 File",
                desc: "Centralized employee records, onboarding workflows, and self-service portals that keep your team organized.",
                icon: <Users className="w-6 h-6 text-white" />,
                BgIcon: Users, // <--- Thematic Background
                color: "bg-violet-600",
              },
              {
                index: "04",
                title: "Leave Management",
                desc: "Paperless leave filing and approval workflow with automatic balance tracking.",
                icon: <CalendarCheck className="w-6 h-6 text-white" />,
                BgIcon: CalendarCheck, // <--- Thematic Background
                color: "bg-sky-500",
              },
              {
                index: "05",
                title: "Analytics Dashboard",
                desc: "Gain insights into workforce costs, attendance trends, and departmental performance.",
                icon: <BarChart3 className="w-6 h-6 text-white" />,
                BgIcon: BarChart3, // <--- Thematic Background
                color: "bg-teal-500",
              },
              {
                index: "06",
                title: "Bank-Grade Security",
                desc: "Role-based access control and encrypted data transmission to keep sensitive info safe.",
                icon: <ShieldCheck className="w-6 h-6 text-white" />,
                BgIcon: ShieldCheck, // <--- Thematic Background
                color: "bg-rose-500",
              },
            ].map((feature, idx) => (
              <FeatureCard key={idx} {...feature} />
            ))}
          </motion.div>
        </div>
      </section>
      {/* ==================== BENEFITS / STATS ==================== */}
      <section
        id="benefits"
        className="py-24 bg-linear-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-orange-100/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-20 left-1/4 w-[300px] h-[300px] bg-sky-100/30 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-600 tracking-wide mb-4">
              Proven Results
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 leading-tight mb-6">
              Why companies choose <br />
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                Horizon HR
              </span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Horizon HR modernizes payroll, attendance, and employee record{" "}
              <br></br>
              management so your team can focus on growth instead of paperwork.
            </p>
          </div>

          {/* Stats Grid - Premium Edition */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-24">
            {[
              {
                value: "90%",
                label: "Time Saved",
                desc: "Reduction in admin workload",
                gradient: "from-orange-50 to-transparent",
              },
              {
                value: "200+",
                label: "Companies",
                desc: "Trust us with their people",
                gradient: "from-blue-50 to-transparent",
              },
              {
                value: "99.9%",
                label: "Accuracy",
                desc: "Error-free payroll processing",
                gradient: "from-emerald-50 to-transparent",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.5 }}
                className={`relative overflow-hidden rounded-3xl p-8 border border-slate-100 bg-white shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group`}
              >
                {/* Subtle Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-500`}
                />

                {/* Decorative Blur Circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white rounded-full blur-3xl opacity-60 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left">
                  {/* Huge Value Text */}
                  <div className="text-3xl sm:text-3xl font-black text-orange-500 tracking-tighter mb-4 group-hover:scale-105 transition-transform duration-500 origin-left">
                    {stat.value}
                  </div>

                  {/* Animated Divider Line */}
                  <div className="h-1 w-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full mb-4 group-hover:w-full transition-all duration-500 ease-out opacity-80" />

                  {/* Label & Desc */}
                  <h4 className="text-lg font-bold text-slate-800 mb-1">
                    {stat.label}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium">
                    {stat.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Main Benefits Grid - Premium Edition */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-orange-600 font-bold tracking-wider text-xs uppercase">
                  Core Benefits{" "}
                </span>
                <h3 className="text-3xl font-bold text-slate-900 leading-tight">
                  Designed to optimize operations <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-700">
                    and drive measurable growth.
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  {
                    icon: <CheckCircle className="w-5 h-5 text-white" />,
                    title: "Less Errors",
                    desc: "Automated calculations eliminate human errors.",
                    bg: "bg-gradient-to-br from-emerald-400 to-emerald-600",
                    shadow: "shadow-emerald-200",
                  },
                  {
                    icon: <Clock className="w-5 h-5 text-white" />,
                    title: "Real-time Tracking",
                    desc: "See who is clocked in instantly from any device.",
                    bg: "bg-gradient-to-br from-blue-400 to-blue-600",
                    shadow: "shadow-blue-200",
                  },
                  {
                    icon: <Users className="w-5 h-5 text-white" />,
                    title: "Mobile First",
                    desc: "Access anywhere, anytime via our secure cloud.",
                    bg: "bg-gradient-to-br from-violet-400 to-violet-600",
                    shadow: "shadow-violet-200",
                  },
                  {
                    icon: <ShieldCheck className="w-5 h-5 text-white" />,
                    title: "Fully Compliant",
                    desc: "Always updated with the latest labor laws.",
                    bg: "bg-gradient-to-br from-orange-400 to-orange-600",
                    shadow: "shadow-orange-200",
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group flex flex-col p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Subtle hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative z-10">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg ${item.bg} ${item.shadow}`}
                      >
                        {item.icon}
                      </div>

                      <h4 className="font-bold text-slate-900 mb-2 text-lg">
                        {item.title}
                      </h4>

                      <p className="text-sm text-slate-500 leading-relaxed break-words whitespace-normal [overflow-wrap:anywhere]">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Visual - Enhanced Premium Dashboard Preview */}
            <div className="relative perspective-1000">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, rotateY: 5 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10"
              >
                {/* 1. Refined Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-orange-500/20 to-amber-500/20 rounded-[2.5rem] blur-2xl opacity-70"></div>

                {/* 2. Main Dashboard Container */}
                <div className="relative bg-white rounded-[2rem] shadow-2xl border border-slate-100/50 overflow-hidden">
                  {/* Header */}
                  <div className="bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm tracking-wide">
                          HR OVERVIEW
                        </h3>
                        <p className="text-slate-400 text-xs font-medium">
                          System Status:{" "}
                          <span className="text-emerald-400">Optimal</span>
                        </p>
                      </div>
                    </div>
                    {/* Live Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700 backdrop-blur-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Dashboard Body */}
                  <div className="p-6 space-y-6 bg-slate-50/50">
                    {/* Stats Cards - "Hero" Style */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Card 1: The "Hero" Card (Dark Gradient) */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/20">
                            +12%
                          </span>
                        </div>
                        <div className="text-3xl font-bold tracking-tight mb-1">
                          127
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Active Employees
                        </div>
                      </motion.div>

                      {/* Card 2: The "Light" Card (Clean) */}
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="col-span-1 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 bg-emerald-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">
                            On Track
                          </span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 tracking-tight mb-1">
                          98%
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          Attendance Rate
                        </div>
                      </motion.div>
                    </div>

                    {/* Activity Feed - Polished */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                        Recent Updates
                      </h4>
                      {[
                        {
                          icon: <Users className="w-4 h-4 text-blue-600" />,
                          text: "New employee onboarded",
                          time: "2m ago",
                          bg: "bg-blue-50",
                          border: "border-blue-100",
                        },
                        {
                          icon: (
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                          ),
                          text: "Payroll processed",
                          time: "1h ago",
                          bg: "bg-emerald-50",
                          border: "border-emerald-100",
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition-colors cursor-default"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center ${item.bg} ${item.border} border`}
                          >
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                              {item.text}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {item.time}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Floating 3D Badge */}
                <motion.div
                  initial={{ scale: 0, x: 20 }}
                  whileInView={{ scale: 1, x: 0 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="absolute -bottom-6 -right-6 z-20 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3"
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                      <ShieldCheck size={20} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Security
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      Encryption
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
      {/* ==================== PREMIUM FOOTER WITH WAVE ==================== */}
      <footer className="relative bg-slate-50 pt-32 pb-10 overflow-hidden">
        {/* --- 1. THE WAVE ELEMENT --- */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
          <svg
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="relative block w-full h-[80px] sm:h-[120px]"
          >
            {/* The fill color is 'fill-slate-50' (#f8fafc) to match the footer background.
                If you change the footer bg, change this fill class too.
            */}
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              className="fill-slate-50"
            ></path>
          </svg>
        </div>

        {/* --- 2. Background Blobs (Retained) --- */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-100/40 rounded-full blur-[120px] -z-10" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section: Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
            {/* Brand & Socials */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-2">
                <img
                  src={LOGO_PATH}
                  alt={BRAND_NAME}
                  className="h-16 w-auto object-contain"
                />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                Empowering Filipino businesses with reliable, <br />
                compliant, and human-centric HR technology.
              </p>

              {/* Social Icons */}
              <div className="flex gap-3 pt-2">
                {[Facebook, Linkedin, Mail, ViberIcon].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-orange-500 hover:border-orange-200 hover:shadow-md transition-all duration-300"
                  >
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div className="lg:col-span-2 lg:pl-4">
              <h4 className="font-bold text-slate-900 mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                {["Features", "Pricing", "Integrations", "Security"].map(
                  (item) => (
                    <li key={item}>
                      {item === "Pricing" ? (
                        <button
                          onClick={() => navigate("/pricing")}
                          className="hover:text-orange-600 transition-colors duration-300 block hover:translate-x-1 transform transition-transform"
                        >
                          {item}
                        </button>
                      ) : (
                        <a
                          href="#"
                          className="hover:text-orange-600 transition-colors duration-300 block hover:translate-x-1 transform transition-transform"
                        >
                          {item}
                        </a>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Company Links */}
            <div className="lg:col-span-2">
              <h4 className="font-bold text-slate-900 mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-slate-600">
                {["About Us", "Careers", "Contact", "Partners"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="hover:text-orange-600 transition-colors duration-300 block hover:translate-x-1 transform transition-transform"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div className="lg:col-span-4">
              <h4 className="font-bold text-slate-900 mb-6">Stay Updated</h4>
              <p className="text-sm text-slate-500 mb-4">
                Subscribe to our newsletter for the <br /> latest HR tips and
                system updates.
              </p>

              <div className="flex gap-2 mt-7">
                <div className="relative flex-grow">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-slate-400"
                  />
                </div>
                <button className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-slate-200 hover:shadow-orange-200 active:scale-95">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400 font-medium">
              © 2026 {BRAND_NAME}. All rights reserved.
            </p>
            <div className="flex gap-8">
              <a
                href="#"
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium"
              >
                Cookie Settings
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, index, BgIcon }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className="bg-slate-50 rounded-2xl p-8 h-full flex flex-col hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 border border-slate-100 group relative overflow-hidden"
    >
      {/* --- NEW: THEMATIC BACKGROUND ICON --- */}
      {/* This renders the passed icon (e.g. CreditCard) as a giant watermark */}
      <div className="absolute -bottom-8 -right-8 text-slate-200/50 group-hover:text-slate-300/80 transition-colors duration-300 pointer-events-none">
        <BgIcon
          size={180}
          strokeWidth={0.5}
          className="-rotate-12 opacity-90"
        />
      </div>

      {/* BACKGROUND NUMBER (Optional: You can keep it small or remove it) */}
      <div className="absolute top-6 right-8 text-lg font-bold text-slate-300 group-hover:text-slate-600 transition-colors duration-300">
        {index}
      </div>

      {/* ICON BOX */}
      <div
        className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform duration-300 ease-out relative z-10`}
      >
        {icon}
      </div>

      {/* CONTENT */}
      <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">
        {title}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed flex-grow text-balance relative z-10">
        {desc}
      </p>
    </motion.div>
  );
}
