import axios from "axios";
import BASE_URL from "../../../../../backend/server/config";

// ===================== TIERS =====================
export const getTiers = async () => {
  const res = await axios.get(`${BASE_URL}/Late-deduction-settings/late-deduction-tier/read-late-deduction-tier.php`);
  return res.data;
};

export const getTierById = async (id) => {
  const res = await axios.get(`${BASE_URL}/Late-deduction-settings/late-deduction-tier/read-late-deduction-tier.php?id=${id}`);
  return res.data;
};

export const createTier = async (tier) => {
  const res = await axios.post(`${BASE_URL}/Late-deduction-settings/late-deduction-tier/create-late-deduction-tier.php`, tier);
  return res.data;
};

export const updateTier = async (tier) => {
  const res = await axios.post(`${BASE_URL}/Late-deduction-settings/late-deduction-tier/update-late-deduction-tier.php`, tier);
  return res.data;
};

export const deleteTier = async (id) => {
  const res = await axios.post(`${BASE_URL}/Late-deduction-settings/late-deduction-tier/delete-late-deduction-tier.php`, { id });
  console.log(' asd', res)
  return res.data;
};

// ===================== RULES =====================
export const getRules = async (tierId = null) => {
  const url = tierId
    ? `${BASE_URL}/Late-deduction-settings/late-deduction-rules/read-late-deduction-rules.php?tier_id=${tierId}`
    : `${BASE_URL}/Late-deduction-settings/late-deduction-rules/read-late-deduction-rules.php`;
  const res = await axios.get(url);
  return res.data;
};

export const getRuleById = async (id) => {
  const res = await axios.get(`${BASE_URL}/Late-deduction-settings/late-deduction-rules/read-late-deduction-rules.php?id=${id}`);
  return res.data;
};

export const createRule = async (rule) => {
  const res = await axios.post(`${BASE_URL}/Late-deduction-settings/late-deduction-rules/create-late-deduction-rules.php`, rule);
  return res.data;
};

export const updateRule = async (rule) => {
  const res = await axios.post(`${BASE_URL}/Late-deduction-settings/late-deduction-rules/update-late-deduction-rules.php`, rule);
  return res.data;
};

export const deleteRule = async (id) => {
  const res = await axios.post(`${BASE_URL}/Late-deduction-settings/late-deduction-rules/delete-late-deduction-rules.php`, { id });
  console.error('sdda' ,res)
  return res.data;
};
