import { useState, useEffect, useRef } from "react";
import BASE_URL from "../../../backend/server/config";

const permissionCache = {}; // global cache per username

const usePermissions = (username) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!username) return;

    // ✅ If cached, return immediately
    if (permissionCache[username]) {
      setPermissions(permissionCache[username]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      setLoading(true);
      abortControllerRef.current?.abort(); // cancel any pending fetch
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(
          `${BASE_URL}/users/permissions.php?username=${encodeURIComponent(username)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data?.permissions) {
          permissionCache[username] = data.permissions; // ✅ cache result
          setPermissions(data.permissions);
        } else {
          console.error("Permission error:", data.error || "No permissions returned");
          setPermissions(null);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Fetch failed:", err);
          setPermissions(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();

    // cleanup on unmount
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [username]);

  return { permissions, loading };
};

export default usePermissions;
