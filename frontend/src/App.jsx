import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";

function Home() {
  const { profile } = useAuth();
  if (!profile) return <p className="p-10 text-center text-sm text-ink/40">Loading…</p>;
  if (profile.role === "admin") return <AdminDashboard />;
  if (profile.role === "vendor") return <VendorDashboard />;
  return <UserDashboard />;
}

function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/new"
        element={
          <ProtectedRoute allow={["user", "admin"]}>
            <Layout>
              <NewRequest />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <RequestDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
