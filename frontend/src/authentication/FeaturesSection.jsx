import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import payrollImg from "../assets/payroll_4.png";
import attendanceImg from "../assets/attendance.png";
import digital201Img from "../assets/digital201.png";

export default function FeaturesSection() {
  const features = [
    {
      image: payrollImg,
      title: "Payroll System",
      description: (
        <>
          Automate payroll processing and gain real-time <br /> insights with
          accurate, transparent financial <br /> data.
        </>
      ),
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      image: attendanceImg,
      title: "Daily Time Record Attendance",
      description: (
        <>
          Track employee attendance accurately with <br /> a reliable and
          easy-to-use daily time record <br /> system.
        </>
      ),
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      image: digital201Img,
      title: "Digital 201 File",
      description: (
        <>
          Securely store and manage employee records <br /> with fast access and
          improved document <br /> organization.
        </>
      ),
      gradient: "from-emerald-500/10 to-teal-500/10",
      soon: true, // 👈 Added flag
    },
  ];

  return (
    <section
      id="core-capabilities"
      className="py-16 sm:py-20 lg:py-28 bg-linear-to-b from-slate-50 to-white relative overflow-hidden max-w-[100vw]"
    >
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-blue-600">Features</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            Core System Capabilities
          </h2>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl sm:max-w-2xl mx-auto">
            Modern tools designed to streamline payroll, attendance, and
            employee records management.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 ease-out
 overflow-hidden border border-slate-200/60 hover:-translate-y-1 ${
   feature.soon ? "opacity-95" : ""
 }`}
            >
              <div
                className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative p-5 sm:p-6 flex flex-col h-full">
                {/* Image Container */}
                <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] sm:aspect-[16/9] mb-5 sm:mb-6 shadow-inner">
                  <img
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    src={feature.image}
                    alt={feature.title}
                    loading="lazy"
                  />

                  {/* Soon Available Badge */}
                  {feature.soon && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-white/80 backdrop-blur-md text-emerald-600 border border-emerald-200 shadow-md">
                      Soon Available
                    </div>
                  )}

                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors duration-300" />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-300">
                    {feature.title}
                  </h3>

                  <div className="mt-3 text-slate-600 leading-relaxed text-sm">
                    {feature.description}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
