
/**
 * Utility to manage unique device identification.
 * Safely handles localStorage for SSR environments.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  } catch (e) {
    console.warn('LocalStorage is not available');
    return 'temp_' + Math.random().toString(36).substring(2, 10);
  }
}
