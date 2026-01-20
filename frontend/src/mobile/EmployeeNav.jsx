// DropDownEmp.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useSession } from '../context/SessionContext';
import {
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import FeedIcon from '@mui/icons-material/Feed';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const NAV_HEIGHT = 64; // px

const DropDownEmp = ({ onGoToRequestOver, employeeData, selectedPayroll }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useSession() || {};
  const [selected, setSelected] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  React.useEffect(() => {
    const path = String(location?.pathname || '').toLowerCase();
    if (path.includes('/employee/dashboard')) setSelected('Home');
    else if (path.includes('/employee/dtrforemployee')) setSelected('DTR');
    else if (path.includes('/employee/notification-list')) setSelected('Notifications');
    else setSelected('');
  }, [location.pathname]);

  React.useEffect(() => {
    // add bottom padding so page content doesn't sit under nav (removed on unmount)
    const prevPad = document.body.style.paddingBottom || '';
    document.body.style.paddingBottom = `${NAV_HEIGHT}px`;
    return () => { document.body.style.paddingBottom = prevPad; };
  }, []);

  const handleResetPassword = () => {
    if (!employeeData?.email) return console.warn('missing email');
    navigate('/employee/reset-password', { state: { email: employeeData.email } });
  };
  const confirmLogout = () => {
    try { localStorage.removeItem('user'); } catch {}
    if (typeof setUser === 'function') setUser(null);
    navigate('/login');
  };
  const showLogoutAlert = () => {
    Swal.fire({
      title: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log me out!',
    }).then((res) => { if (res.isConfirmed) confirmLogout(); });
  };

  const goToDTR = () => {
    if (selectedPayroll) navigate('/employee/DTRForEmployee', { state: { employeeData, payroll: selectedPayroll } });
    else navigate('/employee/DTRForEmployee', { state: { employeeData } });
  };

  const bottomNavItems = [
    { label: 'Home', icon: <HomeOutlinedIcon />, action: () => navigate('/employee/dashboard') },
    { label: 'DTR', icon: <FeedIcon />, action: goToDTR },
    { label: 'Notifications', icon: <NotificationsNoneOutlinedIcon />, action: () => navigate('/employee/notification-list', { state: { employeeId: employeeData?.employee_id } }) },
  ];

  // Label is always visible now; slightly smaller on mobile
  const Label = ({ text }) => (
    <Typography
      component="span"
      sx={{
        fontSize: isSm ? 10 : 11,
        display: 'block',
        mt: 0.25,
        textTransform: 'none',
        lineHeight: 1,
        color: 'inherit',
      }}
    >
      {text}
    </Typography>
  );

  // make N+1 equal columns so menu column has same width as items
  const gridCols = `repeat(${bottomNavItems.length + 1}, 1fr)`;

  const nav = (
    <Paper
      elevation={8}
      square
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        maxWidth: '100%',
        height: `${NAV_HEIGHT}px`,
        zIndex: 14000,
        background: '#fff',
        borderTop: `1px solid ${theme.palette.divider}`,
        display: 'grid',
        gridTemplateColumns: gridCols,
        alignItems: 'stretch',
        justifyItems: 'stretch',
        boxSizing: 'border-box',
        px: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        transform: 'translateZ(0)',
        willChange: 'transform',
        overflow: 'hidden',
      }}
      role="navigation"
      aria-label="employee-bottom-navigation"
    >
      {bottomNavItems.map((item, idx) => {
        const active = selected === item.label;
        return (
          <Box
            key={idx}
            onClick={() => { setSelected(item.label); try { item.action(); } catch (e) { console.error(e); } }}
            sx={{
              gridColumn: `${idx + 1} / span 1`,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
            }}
            aria-label={item.label}
            role="button"
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.25,
                px: 0.5,
                py: 0.5,
                width: '100%',
                maxWidth: 160,
                color: active ? 'primary.main' : 'text.secondary',
                textAlign: 'center',
                borderRadius: 1,
              }}
            >
              {React.cloneElement(item.icon, { fontSize: isSm ? 'small' : 'medium' })}
              <Label text={item.label} />
            </Box>
          </Box>
        );
      })}

      {/* MENU cell - same layout as other items so styling is identical */}
      <Box
        sx={{
          gridColumn: `${bottomNavItems.length + 1} / span 1`,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => { setSelected('Menu'); setDrawerOpen(true); }}
        role="button"
        aria-label="menu"
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.25,
            px: 0.5,
            py: 0.5,
            width: '100%',
            maxWidth: 160,
            color: selected === 'Menu' ? 'primary.main' : 'text.secondary',
            textAlign: 'center',
            borderRadius: 1,
          }}
        >
          <MenuIcon fontSize={isSm ? 'small' : 'medium'} />
          <Label text="Menu" />
        </Box>
      </Box>
    </Paper>
  );

  const container = (typeof document !== 'undefined') ? document.body : null;

  return (
    <>
      {container ? createPortal(nav, container) : nav}

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true, disableScrollLock: true }}
        PaperProps={{ sx: { width: 280, boxSizing: 'border-box' } }}
      >
        <List sx={{ width: '100%' }}>
          <ListItem button onClick={() => { handleResetPassword(); setDrawerOpen(false); }}>
            <ListItemIcon><LockResetOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Reset Password" />
          </ListItem>

          <ListItem button onClick={() => { navigate('/employee/Leave-Request-Form', { state: { employeeData } }); setDrawerOpen(false); }}>
            <ListItemIcon><FeedIcon /></ListItemIcon>
            <ListItemText primary="Leave Request Form" />
          </ListItem>

          <ListItem button onClick={() => { showLogoutAlert(); setDrawerOpen(false); }}>
            <ListItemIcon><LogoutOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        </List>
      </Drawer>
    </>
  );
};

export default DropDownEmp;


// // DropDownEmp.jsx
// import React from 'react';
// import { createPortal } from 'react-dom';
// import { useNavigate, useLocation } from 'react-router-dom';
// import Swal from 'sweetalert2';
// import { useSession } from '../context/SessionContext';
// import {
//   Paper,
//   Drawer,
//   IconButton,
//   List,
//   ListItem,
//   ListItemIcon,
//   ListItemText,
//   Box,
//   Typography
// } from '@mui/material';
// import MenuIcon from '@mui/icons-material/Menu';
// import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
// import FeedIcon from '@mui/icons-material/Feed';
// import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
// import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
// import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
// import { useTheme } from '@mui/material/styles';
// import useMediaQuery from '@mui/material/useMediaQuery';

// const NAV_HEIGHT = 64; // px - adjust if you want taller nav
// const MENU_COL_WIDTH = 56; // fixed width reserved for the menu button

// const DropDownEmp = ({ onGoToRequestOver, employeeData, selectedPayroll }) => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { setUser } = useSession() || {};
//   const [selected, setSelected] = React.useState('');
//   const [drawerOpen, setDrawerOpen] = React.useState(false);

//   const theme = useTheme();
//   const isSm = useMediaQuery(theme.breakpoints.down('sm'));

//   React.useEffect(() => {
//     const path = String(location?.pathname || '').toLowerCase();
//     if (path.includes('/employee/dashboard')) setSelected('Home');
//     else if (path.includes('/employee/dtrforemployee')) setSelected('DTR');
//     else if (path.includes('/employee/notification-list')) setSelected('Notifications');
//     else setSelected('');
//   }, [location.pathname]);

//   React.useEffect(() => {
//     // Add bottom padding to body while this nav is present to avoid content being hidden under the nav.
//     // We remove it on unmount.
//     const prevPad = document.body.style.paddingBottom || '';
//     document.body.style.paddingBottom = `${NAV_HEIGHT}px`;
//     return () => {
//       document.body.style.paddingBottom = prevPad;
//     };
//   }, []);

//   const handleResetPassword = () => {
//     if (!employeeData?.email) return console.warn('missing email');
//     navigate('/employee/reset-password', { state: { email: employeeData.email } });
//   };
//   const confirmLogout = () => {
//     try { localStorage.removeItem('user'); } catch {}
//     if (typeof setUser === 'function') setUser(null);
//     navigate('/login');
//   };
//   const showLogoutAlert = () => {
//     Swal.fire({
//       title: 'Are you sure you want to log out?',
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonText: 'Yes, log me out!',
//     }).then((res) => { if (res.isConfirmed) confirmLogout(); });
//   };

//   const goToDTR = () => {
//     if (selectedPayroll) navigate('/employee/DTRForEmployee', { state: { employeeData, payroll: selectedPayroll } });
//     else navigate('/employee/DTRForEmployee', { state: { employeeData } });
//   };

//   // NAV ITEMS: NOTE - payslip removed as requested
//   const bottomNavItems = [
//     { label: 'Home', icon: <HomeOutlinedIcon />, action: () => navigate('/employee/dashboard') },
//     { label: 'DTR', icon: <FeedIcon />, action: goToDTR },
//     { label: 'Notifications', icon: <NotificationsNoneOutlinedIcon />, action: () => navigate('/employee/notification-list', { state: { employeeId: employeeData?.employee_id } }) },
//   ];

//   const Label = ({ text }) => (
//     <Typography
//       component="span"
//       sx={{
//         fontSize: 11,
//         display: isSm ? 'none' : 'inline-block', // hide on small screens
//         ml: 0.5,
//         textTransform: 'none',
//       }}
//     >
//       {text}
//     </Typography>
//   );

//   // stable grid: repeat N items then fixed menu column
//   const gridCols = `repeat(${bottomNavItems.length}, 1fr) ${MENU_COL_WIDTH}px`;

//   const nav = (
//     <Paper
//       elevation={8}
//       square
//       sx={{
//         position: 'fixed',
//         left: 0,
//         right: 0,
//         bottom: 0,
//         // NOTE: don't use width: '100vw' (causes horizontal overflow on some devices).
//         maxWidth: '100%',
//         height: `${NAV_HEIGHT}px`,
//         zIndex: 14000,
//         background: '#fff',
//         borderTop: `1px solid ${theme.palette.divider}`,
//         display: 'grid',
//         gridTemplateColumns: gridCols,
//         alignItems: 'center',
//         boxSizing: 'border-box',
//         px: 1,
//         // safe-area padding inside nav itself
//         paddingBottom: 'env(safe-area-inset-bottom)',
//         // hardware-accelerate to reduce repaint jitter
//         transform: 'translateZ(0)',
//         willChange: 'transform',
//         overflow: 'hidden',
//       }}
//       role="navigation"
//       aria-label="employee-bottom-navigation"
//     >
//       {bottomNavItems.map((item, idx) => {
//         const active = selected === item.label;
//         return (
//           <Box
//             key={idx}
//             onClick={() => { setSelected(item.label); try { item.action(); } catch (e) { console.error(e); } }}
//             sx={{
//               display: 'flex',
//               flexDirection: 'column',
//               alignItems: 'center',
//               justifyContent: 'center',
//               gap: 0.25,
//               px: 0.5,
//               py: 0.5,
//               cursor: 'pointer',
//               color: active ? 'primary.main' : 'text.secondary',
//               textAlign: 'center',
//               borderRadius: 1,
//               userSelect: 'none',
//               // prevent icon/label layout shift when active
//               minHeight: '100%',
//             }}
//             aria-label={item.label}
//             role="button"
//           >
//             {React.cloneElement(item.icon, { fontSize: isSm ? 'small' : 'medium' })}
//             <Label text={item.label} />
//           </Box>
//         );
//       })}

//       {/* menu button fixed column on far right */}
//       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: `${MENU_COL_WIDTH}px` }}>
//         <IconButton onClick={() => setDrawerOpen(true)} size={isSm ? 'small' : 'medium'} aria-label="menu">
//           <MenuIcon fontSize={isSm ? 'small' : 'medium'} />
//         </IconButton>
//       </Box>
//     </Paper>
//   );

//   const container = (typeof document !== 'undefined') ? document.body : null;

//   return (
//     <>
//       {container ? createPortal(nav, container) : nav}

//       <Drawer
//         anchor="right"
//         open={drawerOpen}
//         onClose={() => setDrawerOpen(false)}
//         // prevent body scroll-lock to avoid page width/scrollbar reflow when the drawer opens
//         ModalProps={{ keepMounted: true, disableScrollLock: true }}
//         PaperProps={{ sx: { width: 280, boxSizing: 'border-box' } }}
//       >
//         <List sx={{ width: '100%' }}>
//           <ListItem button onClick={() => { handleResetPassword(); setDrawerOpen(false); }}>
//             <ListItemIcon><LockResetOutlinedIcon /></ListItemIcon>
//             <ListItemText primary="Reset Password" />
//           </ListItem>

//           <ListItem button onClick={() => { navigate('/employee/Leave-Request-Form', { state: { employeeData } }); setDrawerOpen(false); }}>
//             <ListItemIcon><FeedIcon /></ListItemIcon>
//             <ListItemText primary="Leave Request Form" />
//           </ListItem>

//           <ListItem button onClick={() => { showLogoutAlert(); setDrawerOpen(false); }}>
//             <ListItemIcon><LogoutOutlinedIcon /></ListItemIcon>
//             <ListItemText primary="Logout" />
//           </ListItem>
//         </List>
//       </Drawer>
//     </>
//   );
// };

// export default DropDownEmp;


// import * as React from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import Swal from 'sweetalert2';
// import { useSession } from '../context/SessionContext';
// import { Paper } from '@mui/material';
// import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
// import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
// import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
// import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
// import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';

// const DropDownEmp = ({ onGoToRequestOver, employeeData }) => {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { setUser } = useSession();
//   const [selected, setSelected] = React.useState('');

//   React.useEffect(() => {
//     if (location.pathname.includes('/employee/dashboard')) {
//       setSelected('Home');
//     } else if (location.pathname.includes('/employee/overtime-request')) {
//       setSelected('Overtime');
//     } else if (location.pathname.includes('/employee/reset-password')) {
//       setSelected('Reset');
//     } else if (location.pathname.includes('/employee/notification-list')) {
//       setSelected('Notifications');
//     } else {
//       setSelected('');
//     }
//   }, [location.pathname]);

//   const handleResetPassword = () => {
//     if (!employeeData) return;
//     const employeeEmail = employeeData.email;
//     navigate('/employee/reset-password', { state: { email: employeeEmail } });
//   };

//   const confirmLogout = () => {
//     localStorage.removeItem("user");
//     setUser(null);
//     navigate("/login");
//   };

//   const showLogoutAlert = () => {
//     Swal.fire({
//       title: 'Are you sure you want to log out?',
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#d33',
//       cancelButtonColor: '#3085d6',
//       confirmButtonText: 'Yes, log me out!',
//       cancelButtonText: 'No, cancel!',
//     }).then((result) => {
//       if (result.isConfirmed) {
//         confirmLogout();
//       }
//     });
//   };

//   const navItems = [
//     { label: 'Home', icon: <HomeOutlinedIcon />, action: () => navigate("/employee/dashboard") },
//     { label: 'Overtime', icon: <FavoriteBorderIcon />, action: onGoToRequestOver },
//     {
//       label: 'Notifications',
//       icon: <NotificationsNoneOutlinedIcon />,
//       action: () => {
//         if (employeeData?.employee_id) {
//           navigate("/employee/notification-list", { state: { employeeId: employeeData.employee_id } });
//         } else {
//           console.warn("⚠ No employeeData found, cannot navigate with employeeId.");
//         }
//       }
//     },
//     { label: 'Reset', icon: <LockResetOutlinedIcon />, action: handleResetPassword },
//     { label: 'Logout', icon: <LogoutOutlinedIcon />, action: showLogoutAlert }
//   ];

//   return (
//     <Paper
//       elevation={3}
//       sx={{
//         position: 'fixed',
//         bottom: 0,
//         left: 0,
//         right: 0,
//         display: 'flex',
//         justifyContent: 'space-around',
//         paddingY: 1,
//         borderRadius: '16px 16px 0 0',
//         backgroundColor: '#fff',
//         zIndex: 50,
//       }}
//     >
//       {navItems.map((item, index) => {
//         const isActive = selected === item.label;
//         return (
//           <div
//             key={index}
//             onClick={() => {
//               setSelected(item.label);
//               item.action();
//             }}
//             className={`flex flex-col items-center cursor-pointer px-2 py-1 rounded-lg
//               transition-all duration-300 ease-in-out
//               ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-transparent text-gray-600'}`}
//           >
//             <div className={`mb-1 ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
//               {item.icon}
//             </div>
//             <span className="text-xs">{item.label}</span>
//           </div>
//         );
//       })}
//     </Paper>
//   );
// };

// export default DropDownEmp;

