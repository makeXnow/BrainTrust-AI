import { useRef, useCallback } from 'react';

/**
 * A hook to manage intelligent auto-scrolling.
 * It will only scroll to the bottom if the user is already at the bottom
 * (within a certain threshold) or if a force scroll is requested.
 */
export const useAutoScroll = <T extends HTMLElement>(threshold = 100) => {
  const scrollRef = useRef<T>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // If we are within the threshold of the bottom, we consider it "at the bottom"
      const atBottom = scrollHeight - scrollTop <= clientHeight + threshold;
      isAtBottomRef.current = atBottom;
    }
  }, [threshold]);

  const scrollToBottom = useCallback((force = false) => {
    if (scrollRef.current && (force || isAtBottomRef.current)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return { scrollRef, handleScroll, scrollToBottom };
};
