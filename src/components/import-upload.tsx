"use client";

import { useState } from "react";

export function ImportUpload() {
  const [fileName, setFileName] = useState("No file selected");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsUploading(true);

    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const payload = (await response.json()) as { message?: string };
      setFileName(payload.message || "Upload queued successfully.");
    } catch (error) {
      setFileName(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Import batch</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">CSV intake</h3>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <input type="file" name="file" accept=".csv,.txt" className="block w-full text-sm text-slate-600" />
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          {fileName}
        </div>
        <button
          type="submit"
          disabled={isUploading}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isUploading ? "Uploading..." : "Queue import"}
        </button>
      </div>
    </form>
  );
}
