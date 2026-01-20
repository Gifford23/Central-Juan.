import React, { useState } from "react";
import { Button } from "@mui/material";
import RuleForm from "./RuleForm";
import { useRules } from "../../late-deduction-TierAndRule/late-deduction-TierAndRuleHooks/TierAndRulesHooks";

const RuleList = ({ tier }) => {
  const { rules, addRule, editRule, removeRule } = useRules(tier?.id);
  const [openForm, setOpenForm] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);

  if (!tier) {
    return <p className="text-gray-500">Select a tier to manage its rules.</p>;
  }

  const handleAdd = () => {
    setSelectedRule(null);
    setOpenForm(true);
  };

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setOpenForm(true);
  };

  return (
    <div className="p-4 mt-4 bg-white shadow-md rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Rules for Tier: {tier.tier_name}</h2>
        <Button variant="contained" onClick={handleAdd}>
          + Add Rule
        </Button>
      </div>

      {/* Responsive list of rule cards */}
      {(!Array.isArray(rules) || rules.length === 0) ? (
        <div className="p-6 rounded-lg bg-gray-50">
          <p className="text-gray-500">No rules defined for this tier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {(rules || []).map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col justify-between p-4 transition bg-white border rounded-lg shadow-sm sm:flex-row sm:items-center hover:shadow-md"
              role="listitem"
              aria-label={`Rule ${rule.id}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-3">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Min:</span> {rule.min_minutes}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Max:</span> {rule.max_minutes ?? "∞"}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Type:</span> {rule.deduction_type}
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Value:</span> {rule.deduction_value}
                  </div>
                </div>

                <p className="mt-2 text-sm text-gray-600 truncate">{rule.description}</p>
              </div>

              <div className="flex flex-shrink-0 gap-2 mt-3 sm:mt-0">
                <Button size="small" onClick={() => handleEdit(rule)}>
                  Edit
                </Button>

                <Button size="small" color="error" onClick={() => removeRule(rule.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {openForm && (
        <RuleForm
          open={openForm}
          onClose={() => setOpenForm(false)}
          onSave={selectedRule ? editRule : addRule}
          initialData={selectedRule}
          tierId={tier.id}
        />
      )}
    </div>
  );
};

export default RuleList;




// // src/components/lateDeduction/RuleList.jsx
// import React, { useState } from "react";
// import { Button } from "@mui/material";
// import RuleForm from "./RuleForm";
// import { useRules } from "../../late-deduction-TierAndRule/late-deduction-TierAndRuleHooks/TierAndRulesHooks";

// const RuleList = ({ tier }) => {
//   const { rules, addRule, editRule, removeRule } = useRules(tier?.id);
//   const [openForm, setOpenForm] = useState(false);
//   const [selectedRule, setSelectedRule] = useState(null);

//   if (!tier) {
//     return <p className="text-gray-500">Select a tier to manage its rules.</p>;
//   }

//   const handleAdd = () => {
//     setSelectedRule(null);
//     setOpenForm(true);
//   };

//   const handleEdit = (rule) => {
//     setSelectedRule(rule);
//     setOpenForm(true);
//   };

//   return (
//     <div className="p-4 mt-4 bg-white shadow-md rounded-xl">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-xl font-semibold">
//           Rules for Tier: {tier.tier_name}
//         </h2>
//         <Button variant="contained" onClick={handleAdd}>
//           + Add Rule
//         </Button>
//       </div>

//       <table className="w-full border">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="p-2 border">Min (min)</th>
//             <th className="p-2 border">Max (min)</th>
//             <th className="p-2 border">Type</th>
//             <th className="p-2 border">Value</th>
//             <th className="p-2 border">Description</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
// <tbody>
//   {(Array.isArray(rules) ? rules : []).map((rule) => (
//     <tr key={rule.id}>
//       <td className="p-2 border">{rule.min_minutes}</td>
//       <td className="p-2 border">{rule.max_minutes || "∞"}</td>
//       <td className="p-2 border">{rule.deduction_type}</td>
//       <td className="p-2 border">{rule.deduction_value}</td>
//       <td className="p-2 border">{rule.description}</td>
//       <td className="flex gap-2 p-2 border">
//         <Button size="small" onClick={() => handleEdit(rule)}>
//           Edit
//         </Button>
//         <Button size="small" color="error" onClick={() => removeRule(rule.id)}>
//           Delete
//         </Button>
//       </td>
//     </tr>
//   ))}
// </tbody>

//       </table>

//       {openForm && (
//         <RuleForm
//           open={openForm}
//           onClose={() => setOpenForm(false)}
//           onSave={selectedRule ? editRule : addRule}
//           initialData={selectedRule}
//           tierId={tier.id}
//         />
//       )}
//     </div>
//   );
// };

// export default RuleList;
