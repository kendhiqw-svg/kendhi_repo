import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import FileUploadField from "../components/FileUploadField";

export default function RequestDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraEvidence, setCameraEvidence] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("requests")
      .select("*, stores(name, code, address), creator:profiles!requests_created_by_fkey(full_name), vendor:profiles!requests_assigned_vendor_fkey(full_name)")
      .eq("id", id)
      .single();
    if (!error) {
      setRequest(data);
      setCameraEvidence(data.camera_evidence || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isVendor = profile?.role === "vendor" && request?.assigned_vendor === profile.id;
  const isAdmin = profile?.role === "admin";

  async function markStarted() {
    await supabase.from("requests").update({ status: "in_progress" }).eq("id", id);
    load();
  }

  async function markInstalled() {
    if (cameraEvidence.length === 0) {
      setError("Please upload at least one photo of the installed camera first.");
      return;
    }
    setError("");
    setSaving(true);
    // The Database Webhook on UPDATE detects camera_installed flipping to
    // true and fires the notify-completion Edge Function automatically.
    await supabase
      .from("requests")
      .update({
        camera_installed: true,
        camera_evidence: cameraEvidence,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setSaving(false);
    load();
  }

  if (loading) return <p className="p-10 text-center text-sm text-ink/40">Loading…</p>;
  if (!request) return <p className="p-10 text-center text-sm text-ink/40">Request not found.</p>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button onClick={() => navigate(-1)} className="text-sm text-ink/40 mb-4 hover:text-ink">
        ← Back
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">{request.stores?.name}</h1>
          <p className="text-sm text-ink/40 font-mono">{request.stores?.code} · {request.stores?.address}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="card p-6 mb-6 text-sm space-y-1">
        <p><span className="text-ink/50">Submitted by:</span> {request.creator?.full_name ?? "—"}</p>
        <p><span className="text-ink/50">Assigned vendor:</span> {request.vendor?.full_name ?? "Unassigned"}</p>
        <p><span className="text-ink/50">Due date:</span> {request.due_date} ({request.sla_days}-day SLA)</p>
      </div>

      <h2 className="font-medium mb-3">Pre-installation checklist</h2>
      <div className="space-y-4 mb-8">
        <ReadOnlyItem
          number="01"
          question="Internet connection established?"
          answer={request.internet_established}
          evidence={request.internet_evidence}
        />
        <ReadOnlyItem
          number="02"
          question="Cable installation finished?"
          answer={request.cable_installed}
          evidence={request.cable_evidence}
        />
        <ReadOnlyItem
          number="03"
          question="PoE switch already in store?"
          answer={request.poe_switch_available}
          evidence={request.poe_evidence}
        />
      </div>

      <h2 className="font-medium mb-3">Vendor installation</h2>
      <div className="card p-6">
        <p className="font-medium mb-3">Has the camera been installed?</p>
        {request.camera_installed ? (
          <>
            <p className="text-sm text-brand-dark mb-3">✓ Confirmed installed on {new Date(request.completed_at).toLocaleString()}</p>
            <EvidenceGrid urls={request.camera_evidence} />
          </>
        ) : isVendor ? (
          <div className="space-y-4">
            {request.status === "assigned" && (
              <button onClick={markStarted} className="btn-secondary">
                Start installation
              </button>
            )}
            <FileUploadField
              pathPrefix={`requests/${id}/camera`}
              value={cameraEvidence}
              onChange={setCameraEvidence}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={markInstalled} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Mark installation finished"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink/40">Not yet completed.</p>
        )}
      </div>
      {isAdmin && !request.camera_installed && (
        <p className="text-xs text-ink/40 mt-3">
          Waiting on {request.vendor?.full_name ?? "an assigned vendor"} to complete the install.
        </p>
      )}
    </div>
  );
}

function ReadOnlyItem({ number, question, answer, evidence }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="eyebrow mt-0.5">{number}</span>
        <div className="flex-1">
          <p className="font-medium mb-1">{question}</p>
          <p className={`text-sm mb-2 ${answer ? "text-brand-dark" : "text-amber-signal"}`}>
            {answer ? "Yes, confirmed" : "Not confirmed"}
          </p>
          <EvidenceGrid urls={evidence} />
        </div>
      </div>
    </div>
  );
}

function EvidenceGrid({ urls }) {
  if (!urls || urls.length === 0) return <p className="text-xs text-ink/30">No photo evidence attached</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-md overflow-hidden border border-ink/10 block">
          <img src={url} alt="Evidence" className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  );
}
