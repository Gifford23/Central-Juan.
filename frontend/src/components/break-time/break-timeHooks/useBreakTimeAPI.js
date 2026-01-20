// useBreakTimeAPI.js
import { useState, useEffect, useCallback } from "react";
import {
  fetchBreakTimes,
  createBreakTime,
  updateBreakTime,
  deleteBreakTime,
} from "../break-timeAPI/BreakTimeAPI";

// Hook to fetch breaks and expose a refetch function
export const useFetchBreakTimes = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    const res = await fetchBreakTimes(params);
    if (res.success) setData(res.data || []);
    else setData([]);
    setLoading(false);
    return res;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    loading,
    refetch: load, // parent can call refetch() to update list
    setData, // optional if you want to update locally
  };
};

// Create
export const useCreateBreakTime = () => {
  const [loading, setLoading] = useState(false);

  const create = async (payload) => {
    setLoading(true);
    try {
      const res = await createBreakTime(payload);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
};

// Update
export const useUpdateBreakTime = () => {
  const [loading, setLoading] = useState(false);

  const update = async (id, payload) => {
    setLoading(true);
    try {
      const res = await updateBreakTime(id, payload);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading };
};

// Delete
export const useDeleteBreakTime = () => {
  const [loading, setLoading] = useState(false);

  const remove = async (id) => {
    setLoading(true);
    try {
      const res = await deleteBreakTime(id);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading };
};



// import { useState, useEffect } from "react";
// import {
//   fetchBreakTimes,
//   createBreakTime,
//   updateBreakTime,
//   deleteBreakTime,
// } from "../break-timeAPI/BreakTimeAPI";

// // ✅ Hook to fetch all breaks
// export const useFetchBreakTimes = () => {
//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       const res = await fetchBreakTimes();
//       if (res.success) setData(res.data);
//       setLoading(false);
//     };
//     load();
//   }, []); // ✅ runs only once

//   return { data, loading };
// };


// // ✅ Hook to create a break
// export const useCreateBreakTime = () => {
//   const [loading, setLoading] = useState(false);

//   const create = async (data) => {
//     setLoading(true);
//     try {
//       return await createBreakTime(data);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { create, loading };
// };

// // Hook to update a break
// export const useUpdateBreakTime = () => {
//   const [loading, setLoading] = useState(false);

//   const update = async (id, payload) => {
//     setLoading(true);
//     try {
//       if (typeof updateBreakTime !== "function") {
//         console.error("updateBreakTime is not available.");
//         return { success: false, message: "update function not available" };
//       }
//       return await updateBreakTime(id, payload);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { update, loading };
// };

// // Hook to delete a break
// export const useDeleteBreakTime = () => {
//   const [loading, setLoading] = useState(false);

//   const remove = async (id) => {
//     setLoading(true);
//     try {
//       if (typeof deleteBreakTime !== "function") {
//         console.error("deleteBreakTime is not available.");
//         return { success: false, message: "delete function not available" };
//       }
//       return await deleteBreakTime(id);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { remove, loading };
// };