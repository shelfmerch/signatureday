import { useState, useEffect, useCallback } from 'react';

/**
 * Countdown timer for OTP resend. Starts at initialSeconds and counts down to 0.
 * @param initialSeconds - e.g. 60 for 60-second cooldown
 * @returns [secondsLeft, startTimer] - secondsLeft 0 when expired; startTimer() resets to initialSeconds
 */
export function useOtpTimer(initialSeconds: number): [number, () => void] {
  const [secondsLeft, setSecondsLeft] = useState(0);

  const startTimer = useCallback(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  return [secondsLeft, startTimer];
}
