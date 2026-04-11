import { toast as sonnerToast, type ExternalToast } from 'sonner';
import { playNotificationSound } from './notification-sound';

type ToastMessage = string | React.ReactNode;

function withSound<T>(fn: (...args: any[]) => T) {
  return (...args: any[]): T => {
    playNotificationSound();
    return fn(...args);
  };
}

// Wrap sonner toast with sound
const toast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) => {
    playNotificationSound();
    return sonnerToast(message, data);
  },
  {
    success: withSound(sonnerToast.success),
    error: withSound(sonnerToast.error),
    warning: withSound(sonnerToast.warning),
    info: withSound(sonnerToast.info),
    loading: sonnerToast.loading, // no sound for loading
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    message: withSound(sonnerToast.message),
    custom: withSound(sonnerToast.custom),
  }
);

export { toast };
