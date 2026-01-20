import { useState } from "react";
import { updateContributionOverrideAPI } from '../payrollApi/payrollapi';

export default function useContributionOverride() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveOverride = async ({ employee_id, type, override_amount, is_override_enabled }) => {
    setLoading(true);
    setError(null);

    try {
      const res = await updateContributionOverrideAPI({ employee_id, type, override_amount, is_override_enabled });
      setLoading(false);
      return res;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { saveOverride, loading, error };
}
