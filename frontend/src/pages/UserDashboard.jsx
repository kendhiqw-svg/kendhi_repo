import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";

export default function UserDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("requests")
        .select("id, due_date, status, created_at, stores(name, code)")
        .eq("created_by", profile.id)
        .order("created_at", { ascending: false });
      setRequests(data || []);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">Your requests</h1>
          <p className="text-sm text-ink/50">Installation requests you've submitted</p>
        </div>
        <Link to="/new" className="btn-primary">
          + New request
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink/50 text-sm">No requests yet. Submit one once a store has finished construction.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink/10">
          {requests.map((r) => (
            <Link
              key={r.id}
              to={`/requests/${r.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-ink/[0.02] transition-colors"
            >
              <div>
                <p className="font-medium">{r.stores?.name ?? "Unknown store"}</p>
                <p className="text-xs text-ink/40 font-mono">{r.stores?.code} · Due {r.due_date}</p>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
