import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Define swipeable paths in order
  const paths = ["/", "/dashboard", "/docs", "/bots", "/premium"]; // Note: we removed /bots but I'll leave the string just in case it doesn't match

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only enable on mobile width
      if (window.innerWidth > 768) return;
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (window.innerWidth > 768) return;
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (window.innerWidth > 768) return;
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 70; // min distance
      const isRightSwipe = distance < -70;
      
      const currentIndex = paths.indexOf(location.pathname);
      if (currentIndex === -1) {
        setTouchStart(null);
        setTouchEnd(null);
        return;
      }

      if (isLeftSwipe && currentIndex < paths.length - 1) {
        navigate(paths[currentIndex + 1]);
      }
      if (isRightSwipe && currentIndex > 0) {
        navigate(paths[currentIndex - 1]);
      }
      
      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, location.pathname, navigate]);

  return null;
}
