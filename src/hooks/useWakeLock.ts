import { useEffect, useRef } from 'react';

export const useWakeLock = () => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock is active!');
          
          wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock was released');
          });
        } else {
          console.log('Wake lock API not supported');
        }
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.error(`Wake Lock error: ${err.name}, ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else {
        if (wakeLockRef.current !== null) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
};
