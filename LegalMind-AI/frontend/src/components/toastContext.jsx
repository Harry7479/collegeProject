import { useMemo } from 'react';
import { toast } from 'react-toastify';

const toastByType = {
  success: toast.success,
  error: toast.error,
  info: toast.info,
  warning: toast.warning,
};

export function useToast() {
  return useMemo(() => ({
    addToast: (message, type = 'info', duration = 3200) => {
      const notify = toastByType[type] || toast.info;
      notify(message, {
        autoClose: duration,
      });
    },
    removeToast: (id) => {
      if (id) {
        toast.dismiss(id);
      }
    },
  }), []);
}
