import { useState, useCallback } from 'react';
import Notification from '../components/Notification';

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 4000) => {
    setNotification({ message, type, duration });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const NotificationComponent = notification ? (
    <Notification
      message={notification.message}
      type={notification.type}
      duration={notification.duration}
      onClose={hideNotification}
    />
  ) : null;

  return {
    showNotification,
    hideNotification,
    NotificationComponent,
    // שיטות נוחות
    showSuccess: (message, duration) => showNotification(message, 'success', duration),
    showError: (message, duration) => showNotification(message, 'error', duration),
    showWarning: (message, duration) => showNotification(message, 'warning', duration),
    showInfo: (message, duration) => showNotification(message, 'info', duration),
  };
};
