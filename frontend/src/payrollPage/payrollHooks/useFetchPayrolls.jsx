// components/payroll/hooks/useFetchPayrolls.js
import { useEffect } from 'react';
import { fetchPayrollsAPI } from '../payrollApi/payrollapi';

const useFetchPayrolls = (setPayrollData, setError, setLoading) => {
  useEffect(() => {
    const load = async () => {
      console.log("🔄 Fetching payroll data...");
      try {
        const response = await fetchPayrollsAPI();
        console.log("✅ API Response:", response);

        if (response?.data?.success) {
          console.log("📊 Payroll Data:", response.data.data);
          setPayrollData(response.data.data);
        } else {
          console.warn("⚠️ API Error:", response?.data?.message);
          setError(response?.data?.message || "Unknown error from API");
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setError('Error fetching data: ' + err.message);
      } finally {
        console.log("⏹️ Finished loading payrolls");
        setLoading(false);
      }
    };
    load();
  }, [setPayrollData, setError, setLoading]);
};

export default useFetchPayrolls;
