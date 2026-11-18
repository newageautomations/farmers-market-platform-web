import { useEffect, useRef, useState } from 'react';

/** Feedback is triggered by a committed cart change, never by the click itself. */
export function useCartFeedback() {
  const [feedback, setFeedback] = useState({ added: false, cycle: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  function showAdded() {
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setFeedback((previous) => ({ added: true, cycle: previous.cycle + 1 }));
    timer.current = setTimeout(() => {
      setFeedback((previous) => ({ ...previous, added: false }));
    }, 1_500);
  }

  return { feedback, showAdded };
}
