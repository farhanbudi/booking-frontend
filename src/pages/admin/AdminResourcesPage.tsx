import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatIDR, resourceApi, type Resource } from "../../api/client";

interface FormState {
  name: string;
  capacity: string;
  location: string;
  pricePerHour: string;
}

const emptyForm: FormState = {
  name: "",
  capacity: "",
  location: "",
  pricePerHour: "",
};

function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const withSeparator = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${withSeparator}`;
}

function parseRupiahInput(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    resourceApi
      .list()
      .then(setResources)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEdit(r: Resource) {
    setEditing(r);
    setForm({
      name: r.name,
      capacity: String(r.capacity),
      location: r.location ?? "",
      pricePerHour:
        r.pricePerHour != null ? formatRupiahInput(String(r.pricePerHour)) : "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Nama ruangan wajib diisi.");
      return;
    }

    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity < 1) {
      toast.error("Kapasitas harus angka minimal 1.");
      return;
    }

    const location = form.location.trim();
    const priceRaw = parseRupiahInput(form.pricePerHour);
    let pricePerHour: number | undefined;
    if (priceRaw) {
      const parsed = Number(priceRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Harga per jam harus angka 0 atau lebih.");
        return;
      }
      pricePerHour = parsed;
    }
    const payload = {
      name,
      capacity,
      location: location ? location : undefined,
      ...(pricePerHour != null ? { pricePerHour } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await resourceApi.update(editing.id, payload);
        toast.success("Ruangan berhasil diperbarui.");
      } else {
        await resourceApi.create(payload);
        toast.success("Ruangan berhasil ditambahkan.");
      }
      closeForm();
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menyimpan ruangan.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(r: Resource) {
    setDeactivatingId(r.id);
    try {
      await resourceApi.remove(r.id);
      toast.success(`Ruangan "${r.name}" berhasil dinonaktifkan.`);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menonaktifkan ruangan.");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 px-1">
      <h1 className="text-2xl font-semibold mb-1">Kelola ruangan</h1>
      <p className="text-muted text-sm mb-6">
        Tambah, ubah, atau nonaktifkan ruangan yang bisa dibooking user.
      </p>

      {loading && <p className="text-muted">Memuat daftar ruangan...</p>}

      <div className="flex justify-end mb-4">
        {!isFormOpen && (
          <button onClick={openCreate} className="btn-primary">
            + Tambah ruangan
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="card mb-6">
          <h3 className="font-medium mb-4">
            {editing ? "Edit ruangan" : "Tambah ruangan baru"}
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="input-field"
                placeholder="Contoh: Ruang Meeting A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Kapasitas</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
                className="input-field"
                placeholder="Minimal 1"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Lokasi</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
                className="input-field"
                placeholder="Opsional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Harga per jam (Rp)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.pricePerHour}
                onChange={(e) => {
                  const formatted = formatRupiahInput(e.target.value);
                  setForm((f) => ({ ...f, pricePerHour: formatted }));
                }}
                className="input-field"
                placeholder="Rp 0"
              />
              <p className="text-xs text-muted mt-1">
                Kosongkan atau isi 0 untuk ruangan gratis.
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="btn-outline"
              disabled={submitting}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {!loading && resources.length === 0 && (
        <div className="card text-center text-muted py-10">
          Belum ada ruangan. Tambahkan ruangan pertama.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {resources.map((r) => (
          <div
            key={r.id}
            className="card flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-muted">
                Kapasitas {r.capacity} orang
                {r.location ? ` · ${r.location}` : ""}
                {" · "}
                {r.pricePerHour != null && r.pricePerHour > 0
                  ? `${formatIDR(r.pricePerHour)} / jam`
                  : "Gratis"}
              </p>
              <span
                className={`inline-block mt-2 text-xs border rounded-full px-2 py-0.5 ${
                  r.isActive
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-100 text-muted border-line"
                }`}
              >
                {r.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            {r.isActive && (
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="btn-outline text-sm !py-1.5"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeactivate(r)}
                  disabled={deactivatingId === r.id}
                  className="btn-outline text-sm !py-1.5"
                >
                  {deactivatingId === r.id ? "Menonaktifkan..." : "Nonaktifkan"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}