// src/utils/axiosInstance.js
import axios from 'axios';
import Swal from 'sweetalert2';
import BASE_URL from '../../../backend/server/config'; // Adjust path as needed

const COOLDOWN_KEY = 'server_cooldown_until'; // Store cooldown time in localStorage

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Add a request interceptor to block requests during cooldown
axiosInstance.interceptors.request.use((config) => {
  const cooldownUntil = localStorage.getItem(COOLDOWN_KEY);
  if (cooldownUntil && new Date().getTime() < parseInt(cooldownUntil)) {
    const remainingTime = Math.ceil((parseInt(cooldownUntil) - Date.now()) / 60000); // Calculate remaining cooldown time in minutes
    Swal.fire({
      icon: 'error',
      title: 'Server Cooling Down',
      text: `Please wait ${remainingTime} minute(s) before retrying.`,
    });
    return Promise.reject(new Error("Server cooling down")); // Reject request while server is cooling down
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 500: {
          const cooldownUntil = new Date().getTime() + 30 * 60 * 1000; // Set cooldown for 30 minutes
          localStorage.setItem(COOLDOWN_KEY, cooldownUntil.toString()); // Store cooldown until time in localStorage

          Swal.fire({
            icon: 'error',
            title: 'Server Error (500)',
            text: 'The server encountered an error. Please wait 30 minutes before retrying.',
            timer: 5000, // Show the error message for 5 seconds before closing the modal
          });
          break;
        }
        case 404:
          Swal.fire({
            icon: 'warning',
            title: 'Not Found (404)',
            text: data?.message || 'The requested resource could not be found.',
          });
          break;
        case 401:
          Swal.fire({
            icon: 'info',
            title: 'Unauthorized (401)',
            text: 'Your session has expired or you are not authorized.',
          });
          break;
        default:
          Swal.fire({
            icon: 'error',
            title: `Error (${status})`,
            text: data?.message || 'An unexpected error occurred.',
          });
      }
    } else if (error.request) {
      Swal.fire({
        icon: 'error',
        title: 'No Response',
        text: 'No response from server. Please check your network.',
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Request Error',
        text: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
