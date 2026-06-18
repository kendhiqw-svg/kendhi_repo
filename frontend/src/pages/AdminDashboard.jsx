import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import StatusBadge from "../components/StatusBadge";

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  async function load() {
    const [{ data: reqRows }, { data: vendorRows }, { data: settingsRow }] = await Promise.all([
      supabase
        .from("requests")
        .select("id, due_date, status, camera_installed, assigned_vendor, stores(name, code), profiles!requests_assigned_vendor_fkey(full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("role", "vendor"),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);
    setRequests(reqRows || []);
    setVendors(vendorRows || []);
    setSettings(settingsRow || { admin_email: "", default_sla_days: 7 });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function assignVendor(requestId, vendorId) {
    await supabase
      .from("requests")
      .update({ assigned_vendor: vendorId || null, status: vendorId ? "assigned" : "pending" })
      .eq("id", requestId);
    load();
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    await supabase
      .from("app_settings")
      .update({ admin_email: settings.admin_email, default_sla_days: settings.default_sla_days })
      .eq("id", 1);
    setSavingSettings(false);
  }

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => ["assigned", "in_progress"].includes(r.status)).length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-1">All installation requests</h1>
      <p className="text-sm text-ink/50 mb-8">Across every store in the rollout</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending" value={counts.pending} />
        <StatCard label="In progress" value={counts.inProgress} />
        <StatCard label="Completed" value={counts.completed} />
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : (
        <div className="card divide-y divide-ink/10 mb-10">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-6 py-4">
              <Link to={`/requests/${r.id}`} className="flex-1">
                <p className="font-medium">{r.stores?.name ?? "Unknown store"}</p>
                <p className="text-xs text-ink/40 font-mono">{r.stores?.code} · Due {r.due_date}</p>
              </Link>
              <select
                className="input w-44 mr-4"
                value={r.assigned_vendor || ""}
                onChange={(e) => assignVendor(r.id, e.target.value)}
              >
                <option value="">Unassigned</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.full_name}
                  </option>
                ))}
              </select>
              <StatusBadge status={r.status} />
            </div>
          ))}
          {requests.length === 0 && (
            <p className="px-6 py-10 text-center text-sm text-ink/40">No requests submitted yet.</p>
          )}
        </div>
      )}

      <div className="card p-6 max-w-md">
        <h2 className="font-medium mb-4">Notification settings</h2>
        {settings && (
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="label">Admin email (gets notified when an install is completed)</label>
              <input
                type="email"
                className="input"
                value={settings.admin_email}
                onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Default SLA (days)</label>
              <input
                type="number"
                min="1"
                className="input"
                value={settings.default_sla_days}
                onChange={(e) => setSettings({ ...settings, default_sla_days: Number(e.target.value) })}
              />
            </div>
            <button className="btn-primary" disabled={savingSettings}>
              {savingSettings ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card p-5">
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-3xl font-display font-semibold">{value}</p>
    </div>
  );
}
