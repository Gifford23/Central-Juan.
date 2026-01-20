import React, { useEffect, useState } from "react";
import useContributionOverride from '../payrollHooks/useContributionoverride';
import Swal from "sweetalert2";

export default function ContributionOverrideModal({
  isOpen,
  onClose,
  employeeId,
  contributionType,
  currentAmount = 0,
  currentIsEnabled = 0,
  onSaved,
}) {
  const { saveOverride, loading, error } = useContributionOverride();
  const [overrideAmount, setOverrideAmount] = useState(currentAmount);
  const [isEnabled, setIsEnabled] = useState(Number(currentIsEnabled) === 1);

  useEffect(() => {
    if (isOpen) {
      setOverrideAmount(currentAmount);
      setIsEnabled(Number(currentIsEnabled) === 1);
    }
  }, [isOpen, currentAmount, currentIsEnabled]);

  if (!isOpen) return null;

  const label = { sss: "SSS", philhealth: "PhilHealth", pagibig: "Pag-IBIG" }[contributionType];

  const handleSave = async () => {
    try {
      const payload = {
        employee_id: employeeId,
        type: contributionType,
        override_amount: parseFloat(overrideAmount) || 0,
        is_override_enabled: isEnabled ? 1 : 0
      };

      const res = await saveOverride(payload);

if (res && res.success) {
  await Swal.fire("✅ Saved", `${label} override saved.`, "success");

  // 1. Pass updated payroll (if returned) or minimal info
  if (onSaved) {
    onSaved(res.payroll ?? {
      type: contributionType,
      override_employee_share: res.override_employee_share,
      is_override_enabled: res.is_override_enabled,
      effective_share: res.effective_share,
    });
  }

  // 2. Tell the rest of the app
  window.dispatchEvent(
    new CustomEvent("payroll:refresh", {
      detail: { employee_id: employeeId, payroll: res.payroll ?? null },
    })
  );

  // 3. Close modal
  onClose();
}

 else {
        Swal.fire("⚠️ Failed", res?.message || "Could not save override.", "warning");
      }
    } catch (err) {
      console.error("Error saving override:", err);
      Swal.fire("❌ Error", "Unable to save override. Check console.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md p-5 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Override {label}</h3>
          <button className="text-gray-500 hover:text-gray-800" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-600">Employee ID: <span className="font-medium">{employeeId}</span></div>

          <div>
            <label className="block mb-1 text-xs text-gray-600">Override Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full p-2 border rounded-md"
              value={overrideAmount}
              onChange={(e) => setOverrideAmount(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Enable override</label>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEnabled ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button className="px-4 py-2 text-sm bg-white border rounded-md hover:bg-gray-50" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>

          {error && <div className="mt-2 text-sm text-red-600">Error saving override. Check console.</div>}
        </div>
      </div>
    </div>
  );
}
