// 📁 loan_hooks/useLoanJournalAPI.jsx
import { useState } from "react";
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

const useLoanJournalAPI = () => {
  const [journalEntries, setJournalEntries] = useState([]);

  /**
   * fetchJournalEntries(loan_id)
   * - returns array of journal entries for given loan_id
   * - also updates hook state (latest fetched result) for convenience
   */
  const fetchJournalEntries = async (loan_id) => {
    try {
      if (!loan_id) return [];
      const res = await axios.get(`${BASE_URL}/loan_journal_entry_api/read_journal_entries.php?loan_id=${encodeURIComponent(loan_id)}`);
      if (res && res.data && res.data.success) {
        const data = res.data.data || [];
        setJournalEntries(data); // update hook state for consumers that rely on it
        // also return the data so callers can use it directly
        return data;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
      return [];
    }
  };

  const createJournalEntry = async (entryData) => {
    try {
      const response = await fetch(`${BASE_URL}/loan_journal_entry_api/create_journal_entry.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entryData),
      });
      const json = await response.json();
      // Optionally update local state optimistically: append created entry if returned
      if (json && json.success && json.journal) {
        setJournalEntries((prev) => [json.journal, ...prev]);
      }
      return json;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const updateJournalEntry = async (entry) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_journal_entry_api/update_journal_entry.php`, entry);
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const deleteJournalEntry = async (journal_id) => {
    try {
      const res = await axios.post(`${BASE_URL}/loan_journal_entry_api/delete_journal_entry.php`, { journal_id });
      if (res.data && res.data.success) {
        // optimistic local update
        setJournalEntries((prev) => prev.filter((j) => j.journal_id !== journal_id));
      }
      return res.data;
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  return {
    journalEntries,
    fetchJournalEntries,
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
  };
};

export default useLoanJournalAPI;
