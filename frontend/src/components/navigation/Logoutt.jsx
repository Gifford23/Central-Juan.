// logoutUtils.js
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

export function useLogout() {
  const navigate = useNavigate();

  function confirmLogout() {
    // ✅ Fully clear your session data
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.clear();

    // ✅ Redirect after logout
    navigate("/login");
  }

  function showLogoutAlert() {
    Swal.fire({
      title: 'Are you sure you want to log out?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, log me out!',
      cancelButtonText: 'No, cancel!',
    }).then((result) => {
      if (result.isConfirmed) {
        confirmLogout();
      }
    });
  }

  return { showLogoutAlert };
}
