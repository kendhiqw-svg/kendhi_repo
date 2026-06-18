import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import FileUploadField from "../components/FileUploadField";

export default function NewRequest() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [requestId] = useState(() => crypto.randomUUID());
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [slaDays, setSlaDays] = useState(7);

  const [storeId, setStoreId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [internetEstablished, setInternetEstablished] = useState(false);
  const [internetEvidence, setInternetEvidence] = useState([]);
  const [cableInstalled, setCableInstalled] = useState(false);
  const [cableEvidence, setCableEvidence] = useState([]);
  const [poeAvailable, setPoeAvailable] = useState(false);
  const [poeEvidence, setPoeEvidence] = useState([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: storeRows }, { data: vendorRows }, { data: settings }] = await Promise.all([
        supabase.from("stores").select("id, name, code").order("name"),
        supabase.from("profiles").select("id, full_name").eq("role", "vendor"),
        supabase.from("app_settings").select("default_sla_days").eq("id", 1).single(),
      ]);
      setStores(storeRows || []);
      setVendors(vendorRows || []);
      if (settings?.default_sla_days) setSlaDays(settings.default_sla_days);
    })();
  }, []);

  const dueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(slaDays || 7));
    return d.toISOString().slice(0, 10);
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!storeId) {
      setError("Please select a store.");
      return;
    }
    setSubmitting(true);

    const { error: insertError } = await supabase.from("requests").insert({
      id: requestId,
      store_id: storeId,
      created_by: profile.id,
      assigned_vendor: vendorId || null,
      internet_established: internetEstablished,
      internet_evidence: internetEvidence,
      cable_installed: cableInstalled,
      cable_evidence: cableEvidence,
      poe_switch_available: poeAvailable,
      poe_evidence: poeEvidence,
      sla_days: slaDays,
      due_date: dueDate,
      status: vendorId ? "assigned" : "pending",
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    // A Supabase Database Webhook (configured in the dashboard) fires the
    // notify-new-request Edge Function automatically on this insert.
    navigate("/");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-1">New installation request</h1>
      <p className="text-sm text-ink/50 mb-8">
        Confirm site readiness for a store that has finished construction.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">Store</label>
            <select className="input" required value={storeId} onChange={(e) => setStoreId(e.target.value)}>
              <option value="">Select a store…</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assign vendor</label>
            <select className="input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">Assign later (admin will assign)</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-ink/50 font-mono">
            Due date (SLA {slaDays} days): <span className="text-ink">{dueDate}</span>
          </div>
        </div>

        <ChecklistItem
          number="01"
          question="Has the internet connection been established?"
          checked={internetEstablished}
          onCheck={setInternetEstablished}
        >
          <FileUploadField
            pathPrefix={`requests/${requestId}/internet`}
            value={internetEvidence}
            onChange={setInternetEvidence}
          />
        </ChecklistItem>

        <ChecklistItem
          number="02"
          question="Has the cable installation finished?"
          checked={cableInstalled}
          onCheck={setCableInstalled}
        >
          <FileUploadField
            pathPrefix={`requests/${requestId}/cable`}
            value={cableEvidence}
            onChange={setCableEvidence}
          />
        </ChecklistItem>

        <ChecklistItem
          number="03"
          question="Is the PoE switch already in the store?"
          checked={poeAvailable}
          onCheck={setPoeAvailable}
        >
          <FileUploadField
            pathPrefix={`requests/${requestId}/poe`}
            value={poeEvidence}
            onChange={setPoeEvidence}
          />
        </ChecklistItem>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Submitting…" : "Submit request"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate("/")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function ChecklistItem({ number, question, checked, onCheck, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3 mb-3">
        <span className="eyebrow mt-0.5">{number}</span>
        <div className="flex-1">
          <p className="font-medium text-ink mb-2">{question}</p>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onCheck(e.target.checked)}
              className="w-4 h-4 accent-[#2C5F4F]"
            />
            Yes, confirmed
          </label>
        </div>
      </div>
      {children}
    </div>
  );
}
