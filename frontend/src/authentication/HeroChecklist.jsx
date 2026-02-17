// src/components/HeroChecklist.jsx
import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const features = [
  "Automated Payroll Processing",
  "Employee Self-Service Portal",
  "Real-Time HR Analytics",
  "Compliance & Tax Ready",
  "Seamless Onboarding Workflows",
  "Smart Attendance Tracking",
];

// 1. Define Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Delays each child by 0.1s
      delayChildren: 0.2, // Waits 0.2s before starting
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 50 }, // Soft spring for elegance
  },
};

const HeroChecklist = () => {
  return (
    <div className="w-full mt-16 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 2. Apply Container Variants to the Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }} // Triggers slightly before fully in view
        >
          {features.map((item, i) => (
            <motion.div
              key={i}
              variants={itemVariants} // 3. Apply Item Variants
              whileHover={{ y: -4, scale: 1.02 }} // Kept your hover effect
              className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-200 transition-all duration-300 group cursor-default"
            >
              {/* Circle Check Icon Box */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 border border-orange-100 text-orange-500 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-all duration-300">
                <Check className="h-5 w-5" strokeWidth={3} />
              </div>

              {/* Text */}
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                {item}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default HeroChecklist;
