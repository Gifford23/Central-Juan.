// src/pages/TierManagementPage.jsx
import React, { useCallback, useState } from "react";
import TierList from "./TierAndRulesComponents/TierList";
import RuleList from "./TierAndRulesComponents/RuleList";

import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/**
 * Page-swap behavior applied on ALL screen sizes:
 * - Default: show TierList
 * - When TierList calls onSelect(tier): switch to RuleList and show Back button
 * - Back returns to TierList
 *
 * No z-index or extra layering is used.
 */
const TierAndRulesManagementPage = () => {
  const [selectedTier, setSelectedTier] = useState(null);
  const [view, setView] = useState("tiers"); // 'tiers' | 'rules'

  // Called by TierList when "Manage Rules" is clicked
  const handleSelectTier = useCallback((tier) => {
    setSelectedTier(tier);
    setView("rules");
  }, []);

  return (
    <div className="p-6 mx-auto max-w-7xl">
      {view === "tiers" ? (
        <div>
          <TierList onSelect={handleSelectTier} />
        </div>
      ) : (
        <div>
          {/* Header with Back button */}
          <div className="flex items-center gap-3 mb-4">
            <IconButton
              aria-label="Back to tiers"
              onClick={() => setView("tiers")}
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>
            <h2 className="text-lg font-semibold">
              Rules {selectedTier ? `for: ${selectedTier.tier_name}` : ""}
            </h2>
          </div>

          <RuleList tier={selectedTier} />
        </div>
      )}
    </div>
  );
};

export default TierAndRulesManagementPage;




// import React, { useState } from "react";
// import TierList from "./TierAndRulesComponents/TierList";
// import RuleList from "./TierAndRulesComponents/RuleList";

// const TierAndRulesManagementPage = () => {
//   const [selectedTier, setSelectedTier] = useState(null);

//   return (
//     <div className="grid grid-cols-2 gap-4 p-6">
//       <TierList onSelect={setSelectedTier} />
//       <RuleList tier={selectedTier} />
//     </div>
//   );
// };

// export default TierAndRulesManagementPage;
