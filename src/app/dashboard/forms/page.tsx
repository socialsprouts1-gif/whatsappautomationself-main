"use client";

import { useState } from "react";
import {
  Plus, Trash2, Eye, X, Check, FileText, ClipboardList,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

type FieldType = "text" | "number" | "email" | "phone" | "select" | "date";

interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

interface WaForm {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
  published: boolean;
  submissionCount: number;
  createdAt: string;
}

interface Submission {
  id: string;
  formId: string;
  data: Record<string, string>;
  submittedAt: string;
}

interface NewFieldDraft {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  optionsText: string;
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

let draftKeySeq = 0;
function newDraftKey(): string {
  draftKeySeq += 1;
  return `draft-${draftKeySeq}`;
}

function emptyField(): NewFieldDraft {
  return { key: newDraftKey(), label: "", type: "text", required: false, optionsText: "" };
}

function PreviewPanel({ form, onClose, onSubmitted }: {
  form: WaForm;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { data, refetch } = useApi<{ form: WaForm; submissions: Submission[] }>(`/api/forms/${form.id}`);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fields = data?.form.fields ?? form.fields;
  const submissions = data?.submissions ?? [];

  async function submitTest() {
    setSubmitting(true);
    try {
      await mutate(`/api/forms/${form.id}`, "PATCH", { submit: values });
      setValues({});
      refetch();
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-500" /> Preview &amp; test — {form.name}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {f.label}{f.required && <span className="text-red-400"> *</span>}
            </label>
            {f.type === "select" ? (
              <select
                value={values[f.label] ?? ""}
                onChange={(e) => setValues({ ...values, [f.label]: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700"
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "date" ? "date" : f.type === "phone" ? "tel" : "text"}
                value={values[f.label] ?? ""}
                onChange={(e) => setValues({ ...values, [f.label]: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            )}
          </div>
        ))}
        {fields.length === 0 && (
          <div className="col-span-2 text-sm text-gray-400">This form has no fields.</div>
        )}
      </div>

      <button
        onClick={submitTest}
        disabled={submitting || fields.length === 0}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Check className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit test"}
      </button>

      <div className="pt-3 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" /> Submissions ({submissions.length})
        </div>
        {submissions.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-sm bg-gray-50 rounded-lg">No submissions yet.</div>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => (
              <div key={s.id} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-700">
                  {Object.entries(s.data).map(([k, v]) => (
                    <span key={k}><strong className="text-gray-500 font-medium">{k}:</strong> {v}</span>
                  ))}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{timeAgo(s.submittedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FormsPage() {
  const { data, refetch } = useApi<{ forms: WaForm[] }>("/api/forms");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldDrafts, setFieldDrafts] = useState<NewFieldDraft[]>([emptyField()]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const forms = data?.forms ?? [];

  function addFieldRow() {
    setFieldDrafts((rows) => [...rows, emptyField()]);
  }
  function removeFieldRow(key: string) {
    setFieldDrafts((rows) => rows.filter((r) => r.key !== key));
  }
  function updateFieldRow(key: string, patch: Partial<NewFieldDraft>) {
    setFieldDrafts((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function createFormNow() {
    if (!name) return;
    const fields = fieldDrafts
      .filter((f) => f.label.trim())
      .map((f) => ({
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: f.type === "select"
          ? f.optionsText.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined,
      }));
    await mutate("/api/forms", "POST", { name, description: description || undefined, fields });
    setName("");
    setDescription("");
    setFieldDrafts([emptyField()]);
    setCreating(false);
    refetch();
  }

  async function togglePublish(f: WaForm) {
    await mutate(`/api/forms/${f.id}`, "PATCH", { published: !f.published });
    refetch();
  }

  async function deleteForm(id: string) {
    await fetch(`/api/forms/${id}`, { method: "DELETE" });
    if (previewId === id) setPreviewId(null);
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="WhatsApp Forms" subtitle="Collect structured data from customers via chat" />
      <div className="p-6 space-y-5">

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">{forms.length} form{forms.length === 1 ? "" : "s"}</div>
          <button onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Form
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Build a new form</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Form name"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-600">Fields</div>
              {fieldDrafts.map((f) => (
                <div key={f.key} className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                  <input value={f.label} onChange={(e) => updateFieldRow(f.key, { label: e.target.value })}
                    placeholder="Field label"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-400 flex-1 min-w-32" />
                  <select value={f.type} onChange={(e) => updateFieldRow(f.key, { type: e.target.value as FieldType })}
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-400 text-gray-700">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="select">Select</option>
                    <option value="date">Date</option>
                  </select>
                  {f.type === "select" && (
                    <input value={f.optionsText} onChange={(e) => updateFieldRow(f.key, { optionsText: e.target.value })}
                      placeholder="Options, comma separated"
                      className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-blue-400 flex-1 min-w-40" />
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
                    <input type="checkbox" checked={f.required} onChange={(e) => updateFieldRow(f.key, { required: e.target.checked })} />
                    Required
                  </label>
                  <button onClick={() => removeFieldRow(f.key)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addFieldRow}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
                <Plus className="w-3.5 h-3.5" /> Add field
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={createFormNow} disabled={!name}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> Create form
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {forms.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="py-12 text-center text-gray-400 text-sm">No forms yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {forms.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="font-semibold text-gray-800 text-sm truncate">{f.name}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={f.published
                      ? { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }
                      : { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}>
                    {f.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex-1 min-h-[36px]">{f.description || <span className="text-gray-300 italic">No description</span>}</p>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-medium">
                    {f.submissionCount} submission{f.submissionCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] text-gray-400">{f.fields.length} field{f.fields.length === 1 ? "" : "s"}</span>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => togglePublish(f)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    {f.published ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={() => setPreviewId((id) => (id === f.id ? null : f.id))}
                    className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> {previewId === f.id ? "Hide" : "Preview & Test"}
                  </button>
                  <button onClick={() => deleteForm(f.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {previewId === f.id && (
                  <div className="mt-3 -mx-5 -mb-5 px-5 pb-5 pt-3 border-t border-gray-100">
                    <PreviewPanel form={f} onClose={() => setPreviewId(null)} onSubmitted={refetch} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
