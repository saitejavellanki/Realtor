import { Navigate, Outlet } from "react-router-dom";
import { isLoggedIn } from "../api";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  if (!isLoggedIn()) return <Navigate to="/" replace />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f1f5f9" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header />
        <main style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}