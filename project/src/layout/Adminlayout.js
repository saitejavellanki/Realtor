import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isLoggedIn } from "../api";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  if (!isLoggedIn()) return <Navigate to="/" replace />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f1f5f9" }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 99, backdropFilter: "blur(2px)",
          }}
        />
      )}

      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Header isMobile={isMobile} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px" : "28px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
