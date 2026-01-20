import { createContext, useContext, useEffect, useState } from 'react';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return {
          ...parsed,
          role: parsed.role?.toUpperCase() || null, // ✅ normalize role
          full_name: parsed.full_name || null,      // ✅ ensure full_name is kept
        };
      }
      return null;
    } catch (err) {
      console.error("Failed to parse localStorage user", err);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(
          'user',
          JSON.stringify({
            ...user,
            role: user.role?.toUpperCase() || null, // ✅ normalize before saving
            full_name: user.full_name || null,      // ✅ keep full_name in storage
          })
        );
      } else {
        localStorage.removeItem('user');
      }
    } catch (err) {
      console.error("Failed to update localStorage", err);
    }
  }, [user]);

  return (
    <SessionContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);



// import { createContext, useState, useContext, useEffect } from 'react';
// import PropTypes from 'prop-types'; // Import PropTypes

// const SessionContext = createContext();

// export function SessionProvider({ children }) {
//   const [user, setUser] = useState(() => {
//     const savedUser = localStorage.getItem('username');
//     const savedRole = localStorage.getItem('role');
//     return savedUser ? { username: savedUser, role: savedRole } : null;
//   });

//   useEffect(() => {
//     if (user) {
//       localStorage.setItem('username', user.username);
//       localStorage.setItem('role', user.role);
//     } else {
//       localStorage.removeItem('username');
//       localStorage.removeItem('role');
//     }
//   }, [user]);

//   return (
//     <SessionContext.Provider value={{ user, setUser }}>
//       {children}
//     </SessionContext.Provider>
//   );
// }

// // Define prop types
// SessionProvider.propTypes = {
//   children: PropTypes.node.isRequired,
// };

// export function useSession() {
//   return useContext(SessionContext);
// }
