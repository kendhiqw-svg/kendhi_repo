import { useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * Props:
 *  - pathPrefix: storage folder prefix, e.g. `requests/{id}/internet`
 *  - value: string[] of existing public URLs
 *  - onChange: (urls: string[]) => void
 *  - multiple: allow more than one photo
 *  - disabled
 */
export default function FileUploadField({ pathPrefix, value = [], onChange, multiple = true, disabled = false }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");

    try {
      const uploadedUrls = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const filename = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("evidence")
          .upload(filename, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("evidence").getPublicUrl(filename);
        uploadedUrls.push(data.publicUrl);
      }
      onChange(multiple ? [...value, ...uploadedUrls] : uploadedUrls);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeAt(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((url, i) => (
          <div key={url} className="relative w-20 h-20 rounded-md overflow-hidden border border-ink/10 group">
            <img src={url} alt="Evidence" className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-0.5 right-0.5 bg-ink/70 text-white rounded-full w-5 h-5 text-xs leading-5 text-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <label className="inline-flex items-center gap-2 text-sm text-brand cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFiles}
            disabled={uploading}
            className="hidden"
          />
          <span className="btn-secondary">
            {uploading ? "Uploading…" : value.length > 0 ? "Add more photos" : "Upload photo evidence"}
          </span>
        </label>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
