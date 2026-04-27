import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { isLoggedIn } from "./api";
import AdminLayout from "./layout/Adminlayout";
import AddProperty from "./pages/Addproperties";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Developers from "./pages/Developers";
import MapView from "./pages/MapView";
import Properties from "./pages/Properties";
import Visits from "./pages/Visits";

function App() {
  return (
    <Router>
      <Routes>
        {/* Root: redirect to dashboard if already logged in */}
        <Route
          path="/"
          element={isLoggedIn() ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Protected admin routes */}
        <Route path="/" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="map" element={<MapView />} />
          <Route path="add-property" element={<AddProperty />} />
          <Route path="developers" element={<Developers />} />
          <Route path="visits" element={<Visits />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;