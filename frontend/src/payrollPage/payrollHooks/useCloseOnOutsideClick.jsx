// components/payroll/hooks/useCloseOnOutsideClick.js
import { useEffect } from 'react';

const useCloseOnOutsideClick = (ref, isOpen, onClose) => {
  useEffect(() => {
    const handleClick = event => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, ref, onClose]);
};

export default useCloseOnOutsideClick;