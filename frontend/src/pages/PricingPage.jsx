import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check,
  Menu,
  X,
  ArrowRight,
  Facebook,
  Linkedin,
  Mail,
} from "lucide-react";

// --- CONFIGURATION ---
const LOGO_PATH = "/systemImage/HorizonHR-logoPC.png"; // Ensure path is correct
const BRAND_NAME = "Horizon HR";

// --- DATA ---
const plans = [
  {
    name: "Starter",
    price: "29",
    description: "Perfect for small teams getting started",
    features: [
      "Up to 25 employees",
      "Core HR management",
      "Basic reporting",
      "Email support",
      "1 admin account",
    ],
    popular: false,
  },
  {
    name: "Professional",
    price: "79",
    description: "Best for growing businesses",
    features: [
      "Up to 200 employees",
      "Full HR suite",
      "Advanced analytics",
      "Priority support",
      "5 admin accounts",
      "Payroll processing",
      "API access",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with complex needs",
    features: [
      "Unlimited employees",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone support",
      "Unlimited admins",
      "Custom workflows",
      "SLA guarantee",
    ],
    popular: false,
  },
];

// --- ANIMATION VARIANTS ---
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// --- CUSTOM VIBER ICON ---
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

export default function PricingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll handler to navigate to LandingPage and scroll to section
  const scrollToSection = (sectionId) => {
    navigate("/");
    // Use setTimeout to ensure navigation completes before scrolling
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-orange-200 selection:text-orange-900">
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
              onClick={() => {
                navigate("/");
                setTimeout(() => {
                  window.scrollTo(0, 0);
                }, 100);
              }}
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

      {/* ==================== PRICING SECTION ==================== */}
      <section className="relative py-24 md:py-32 pt-32 lg:pt-40">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[100px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-100/40 rounded-full blur-[100px] -z-10" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="mx-auto max-w-2xl text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-xs font-bold text-orange-600 tracking-wide uppercase mb-4">
              Flexible Plans
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              Simple, transparent <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                Pricing
              </span>
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Choose the plan that fits your organization. No hidden fees.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-8 md:grid-cols-3 items-start"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={item}
                className={`relative rounded-3xl p-8 transition-all duration-300 ${
                  plan.popular
                    ? "bg-white border-2 border-orange-500 shadow-2xl shadow-orange-200/50 scale-105 z-10"
                    : "bg-white border border-slate-100 shadow-xl hover:shadow-2xl hover:border-orange-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  {plan.price !== "Custom" && (
                    <span className="text-sm font-medium text-slate-500">
                      $
                    </span>
                  )}
                  <span className="text-5xl font-black text-slate-900 tracking-tight">
                    {plan.price}
                  </span>
                  {plan.price !== "Custom" && (
                    <span className="text-sm text-slate-500 font-medium">
                      /mo
                    </span>
                  )}
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-sm text-slate-600"
                    >
                      <div
                        className={`mt-0.5 rounded-full p-0.5 ${plan.popular ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"}`}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 ${
                    plan.popular
                      ? "bg-linear-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:shadow-orange-200 hover:-translate-y-1"
                      : "bg-slate-100 text-slate-900 border border-slate-200 hover:bg-slate-300 hover:border-slate-300"
                  }`}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== PREMIUM FOOTER ==================== */}
      <footer className="relative bg-slate-50 pt-20 pb-10 border-t border-slate-200 overflow-hidden">
        {/* Background Elements (Retained for consistency) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/40 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-100/40 rounded-full blur-[120px] -z-10" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section: Grid Layout */}
          {/* We use a 12-column grid for better proportion control */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
            {/* 1. Brand & Socials (Spans 4 columns) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center gap-2">
                <img
                  src={LOGO_PATH}
                  alt={BRAND_NAME}
                  className="h-16 w-auto object-contain"
                />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                Empowering Filipino businesses with reliable, <br></br>
                compliant, and human-centric HR technology.
              </p>

              {/* Premium Social Icons */}
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

            {/* 2. Product Links (Spans 2 columns) */}
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

            {/* 3. Company Links (Spans 2 columns) */}
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

            {/* 4. Newsletter (Spans 4 columns) */}
            <div className="lg:col-span-4">
              <h4 className="font-bold text-slate-900 mb-6">Stay Updated</h4>
              <p className="text-sm text-slate-500 mb-4">
                Subscribe to our newsletter for the <br></br> latest HR tips and
                system updates.
              </p>

              {/* Input Group */}
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

          {/* Bottom Bar: Copyright & Legal */}
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
