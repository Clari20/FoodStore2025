import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Scroll del window (tienda pública)
    window.scrollTo(0, 0);
    
    // Scroll del layout de administración (dashboard)
    const dashboardScroll = document.getElementById('dashboard-scroll');
    if (dashboardScroll) {
      dashboardScroll.scrollTo(0, 0);
    }
  }, [pathname, search]);

  return null;
}
