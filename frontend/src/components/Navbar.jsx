import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleLabel = { user: "Store user", vendor: "Vendor", admin: "Administrator" };

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <header className="border-b border-ink/10 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display font-semibold text-lg text-ink">Site Readiness</span>
          <span className="eyebrow">Camera Install Tracker</span>
        </Link>
        {profile && (
          <div className="flex items-center gap-4 text-sm">
            {profile.role === "admin" && (
              <Link to="/stores" className="text-ink/60 hover:text-ink transition-colors font-medium">
                Stores
              </Link>
            )}
            <div className="text-right leading-tight">              <div className="font-medium text-ink">{profile.full_name}</div>
              <div className="text-ink/50 text-xs">{roleLabel[profile.role]}</div>
            </div>
            <button onClick={handleSignOut} className="btn-secondary">
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
