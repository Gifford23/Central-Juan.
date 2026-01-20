import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  getTiers,
  createTier,
  updateTier,
  deleteTier,
  getRules,
  createRule,
  updateRule,
  deleteRule,
} from "../late-deduction-TieAndRuleAPIs/TierAndRulesAPI";

export const useTiers = () => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const data = await getTiers();
          console.log("Fetched tiers:", data); // 👀 check what backend returns
      setTiers(data);
    } catch (err) {
      Swal.fire("Error", "Failed to fetch tiers", "error");
    } finally {
      setLoading(false);
    }
  };

  const addTier = async (tier) => {
    const res = await createTier(tier);
    if (res.success) {
      Swal.fire("Success", "Tier created", "success");
      fetchTiers();
    } else {
      Swal.fire("Error", res.message, "error");
    }
  };

  const editTier = async (tier) => {
    const res = await updateTier(tier);
    if (res.success) {
      Swal.fire("Updated", "Tier updated successfully", "success");
      fetchTiers();
    } else {
      Swal.fire("Error", res.message, "error");
    }
  };

  const removeTier = async (id) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the tier and its rules!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it",
    });
    if (confirm.isConfirmed) {
      const res = await deleteTier(id);
      if (res.success) {
        Swal.fire("Deleted", "Tier removed", "success");
        fetchTiers();
      }
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  return { tiers, loading, fetchTiers, addTier, editTier, removeTier };
};

export const useRules = (tierId) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await getRules(tierId);
      console.log("Fetched rules:", data);
      // If your API returns { success, data } adapt accordingly.
      // Here we assume getRules returns the actual rules array (or { success: true, data: [...] }).
      if (Array.isArray(data)) {
        setRules(data);
      } else if (data && data.data) {
        setRules(data.data);
      } else if (data && data.success && Array.isArray(data.rules)) {
        setRules(data.rules);
      } else {
        // fallback: set empty
        setRules([]);
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to fetch rules", "error");
    } finally {
      setLoading(false);
    }
  };

  // IMPORTANT: return the API result so callers (RuleForm) can inspect success/message
  const addRule = async (rule) => {
    try {
      const res = await createRule(rule);
      if (res && res.success) {
        Swal.fire("Success", "Rule created", "success");
        await fetchRules();
      } else {
        // show server-provided error
        const msg = (res && res.message) ? res.message : "Failed to create rule";
        Swal.fire("Error", msg, "error");
      }
      return res; // <-- return response for form to inspect
    } catch (err) {
      console.error("addRule error", err);
      Swal.fire("Error", "Failed to create rule (network)", "error");
      return { success: false, message: err?.message || "Network error" };
    }
  };

  const editRule = async (rule) => {
    try {
      const res = await updateRule(rule);
      if (res && res.success) {
        Swal.fire("Updated", "Rule updated successfully", "success");
        await fetchRules();
      } else {
        const msg = (res && res.message) ? res.message : "Failed to update rule";
        Swal.fire("Error", msg, "error");
      }
      return res; // <-- return for form
    } catch (err) {
      console.error("editRule error", err);
      Swal.fire("Error", "Failed to update rule (network)", "error");
      return { success: false, message: err?.message || "Network error" };
    }
  };

  const removeRule = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Rule?",
      text: "This cannot be undone",
      icon: "warning",
      showCancelButton: true,
    });
    if (!confirm.isConfirmed) return { success: false, message: "Cancelled" };

    try {
      const res = await deleteRule(id);
      if (res && res.success) {
        Swal.fire("Deleted", "Rule removed", "success");
        await fetchRules();
      } else {
        Swal.fire("Error", (res && res.message) ? res.message : "Failed to delete rule", "error");
      }
      return res;
    } catch (err) {
      console.error("removeRule error", err);
      Swal.fire("Error", "Failed to delete rule (network)", "error");
      return { success: false, message: err?.message || "Network error" };
    }
  };

  useEffect(() => {
    if (tierId) fetchRules();
  }, [tierId]);

  return { rules, loading, fetchRules, addRule, editRule, removeRule };
};
