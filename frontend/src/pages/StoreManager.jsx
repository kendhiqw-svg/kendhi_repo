import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

// Expected CSV columns (case-insensitive, order doesn't matter):
// name, code, city, address
// Only "name" and "code" are required.

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], error: "CSV must have a header row and at least one data row." };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const nameIdx = headers.indexOf("name");
  const codeIdx = headers.indexOf("code");
  const cityIdx = headers.indexOf("city");
  const addressIdx = headers.indexOf("address");

  if (nameIdx === -1 || codeIdx === -1) {
    return { rows: [], error: 'CSV must have "name" and "code" columns.' };
  }

  const rows = [];
  const errors = [];
  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx] || "";
    const code = cols[codeIdx] || "";
    if (!name || !code) {
      errors.push(`Row ${i + 2}: missing name or code — skipped`);
      return;
    }
    rows.push({
      name,
      code,
      city: cityIdx >= 0 ? cols[cityIdx] || "" : "",
      address: addressIdx >= 0 ? cols[addressIdx] || "" : "",
    });
  });

  return { rows, errors };
}

export default function StoreManager() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // CSV upload state
  const [preview, setPreview] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileRef = useRef();

  // Single-add state
  const [single, setSingle] = useState({ name: "", code: "", city: "", address: "" });
  const [addingOne, setAddingOne] = useState(false);
  const [singleError, setSingleError] = useState("");

  // Search
  const [search, setSearch] = useState("");

  async function load() {
    const { data } = await supabase.from("stores").select("*").order("name");
    setStores(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // ---- CSV ----
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, errors } = parseCSV(ev.target.result);
      setPreview(rows);
      setParseErrors(errors || []);
    };
    reader.readAsText(file);
  }

  async function handleBulkUpload() {
    if (preview.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    // upsert: if code already exists, update name/city/address
    const { data, error } = await supabase
      .from("stores")
      .upsert(preview, { onConflict: "code", ignoreDuplicates: false })
      .select();

    setUploading(false);
    if (error) {
      setUploadResult({ type: "error", message: error.message });
    } else {
      setUploadResult({ type: "success", count: data.length });
      setPreview([]);
      setParseErrors([]);
      if (fileRef.current) fileRef.current.value = "";
      load();
    }
  }

  function clearPreview() {
    setPreview([]);
    setParseErrors([]);
    setUploadResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ---- Single add ----
  async function handleAddOne(e) {
    e.preventDefault();
    setSingleError("");
    if (!single.name || !single.code) {
      setSingleError("Name and code are required.");
      return;
    }
    setAddingOne(true);
    const { error } = await supabase.from("stores").insert(single);
    setAddingOne(false);
    if (error) {
      setSingleError(error.message);
      return;
    }
    setSingle({ name: "", code: "", city: "", address: "" });
    load();
  }

  // ---- Delete ----
  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone and will affect any linked requests.`)) return;
    await supabase.from("stores").delete().eq("id", id);
    load();
  }

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold mb-1">Store management</h1>
      <p className="text-sm text-ink/50 mb-8">
        {stores.length} store{stores.length !== 1 ? "s" : ""} in the system
      </p>

      {/* ---- CSV bulk upload ---- */}
      <div className="card p-6 mb-6">
        <h2 className="font-medium mb-1">Bulk upload via CSV</h2>
        <p className="text-sm text-ink/50 mb-4">
          Required columns: <span className="font-mono text-xs">name, code</span> — optional:{" "}
          <span className="font-mono text-xs">city, address</span>. If a code already exists it will be
          updated. Download the template below to get started.
        </p>

        <div className="flex flex-wrap gap-3 mb-4">
          <a
            href="data:text/csv;charset=utf-8,name,code,city,address%0AXiaomi Store Margo City,MGC-01,Depok,Jl. Margonda Raya No.358%0AXiaomi Store Grand Indonesia,GID-02,Jakarta,Jl. M.H. Thamrin No.1"
            download="stores_template.csv"
            className="btn-secondary text-sm"
          >
            ⬇ Download template
          </a>
          <label className="btn-secondary text-sm cursor-pointer">
            📂 Choose CSV file
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {parseErrors.length > 0 && (
          <div className="bg-amber-signal/10 border border-amber-signal/20 rounded-md p-3 mb-3">
            {parseErrors.map((e, i) => (
              <p key={i} className="text-xs text-amber-signal">{e}</p>
            ))}
          </div>
        )}

        {preview.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">{preview.length} rows ready to import:</p>
            <div className="overflow-x-auto rounded-md border border-ink/10 max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink/[0.03] sticky top-0">
                  <tr>
                    {["Name", "Code", "City", "Address"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-medium text-ink/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                      <td className="px-3 py-2 text-ink/60">{row.city}</td>
                      <td className="px-3 py-2 text-ink/60 max-w-xs truncate">{row.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-3">
              <button onClick={handleBulkUpload} disabled={uploading} className="btn-primary">
                {uploading ? "Uploading…" : `Upload ${preview.length} stores`}
              </button>
              <button onClick={clearPreview} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {uploadResult && (
          <div
            className={`text-sm rounded-md px-4 py-3 ${
              uploadResult.type === "success"
                ? "bg-brand-light text-brand-dark"
                : "bg-red-50 text-red-700"
            }`}
          >
            {uploadResult.type === "success"
              ? `✓ ${uploadResult.count} store${uploadResult.count !== 1 ? "s" : ""} saved successfully.`
              : `Error: ${uploadResult.message}`}
          </div>
        )}
      </div>

      {/* ---- Single add ---- */}
      <div className="card p-6 mb-6">
        <h2 className="font-medium mb-4">Add a single store</h2>
        <form onSubmit={handleAddOne} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Store name *</label>
            <input
              className="input"
              value={single.name}
              onChange={(e) => setSingle({ ...single, name: e.target.value })}
              placeholder="Xiaomi Store Senayan City"
            />
          </div>
          <div>
            <label className="label">Store code *</label>
            <input
              className="input font-mono"
              value={single.code}
              onChange={(e) => setSingle({ ...single, code: e.target.value.toUpperCase() })}
              placeholder="SNC-01"
            />
          </div>
          <div>
            <label className="label">City</label>
            <input
              className="input"
              value={single.city}
              onChange={(e) => setSingle({ ...single, city: e.target.value })}
              placeholder="Jakarta"
            />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              className="input"
              value={single.address}
              onChange={(e) => setSingle({ ...single, address: e.target.value })}
              placeholder="Jl. Asia Afrika..."
            />
          </div>
          {singleError && <p className="col-span-2 text-sm text-red-600">{singleError}</p>}
          <div className="col-span-2">
            <button type="submit" disabled={addingOne} className="btn-primary">
              {addingOne ? "Adding…" : "Add store"}
            </button>
          </div>
        </form>
      </div>

      {/* ---- Store list ---- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">All stores</h2>
          <input
            className="input w-56"
            placeholder="Search name, code, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="text-sm text-ink/40">Loading…</p>
        ) : (
          <div className="card divide-y divide-ink/10">
            {filtered.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-ink/40">
                {search ? "No stores match your search." : "No stores yet — upload a CSV or add one above."}
              </p>
            )}
            {filtered.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <span className="font-medium">{s.name}</span>
                  <span className="font-mono text-xs text-ink/40 ml-2">{s.code}</span>
                  {s.city && <span className="text-xs text-ink/40 ml-2">· {s.city}</span>}
                  {s.address && <p className="text-xs text-ink/40">{s.address}</p>}
                </div>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors ml-4"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
