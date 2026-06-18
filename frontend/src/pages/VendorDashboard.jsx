import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";

export default function VendorDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("requests")
        .select("id, due_date, status, camera_installed, stores(name, code)")
        .eq("assigned_vendor", profile.id)
        .order("due_date", { ascending: true });
      setRequests(data || []);
      setLoading(false);
    })();
  }, [profile]);

  const open = requests.filter((r) => !r.camera_installed);
  const done = requests.filter((r) => r.camera_installed);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-1">Your tasks</h1>
      <p className="text-sm text-ink/50 mb-8">Stores assigned to you for camera installation</p>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <>
          <Section title={`Open (${open.length})`} requests={open} emptyText="Nothing pending — nice work." />
          <Section title={`Completed (${done.length})`} requests={done} emptyText="No completed installs yet." />
        </>
      )}
    </div>
  );
}

function Section({ title, requests, emptyText }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-medium text-ink/60 mb-3">{title}</h2>
      {requests.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink/40">{emptyText}</div>
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
