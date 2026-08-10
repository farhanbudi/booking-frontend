import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resourceApi, type Resource } from "../api/client";

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resourceApi
      .list()
      .then(setResources)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-10 px-1">
      <h1 className="text-2xl font-semibold mb-1">Ruangan tersedia</h1>
      <p className="text-muted text-sm mb-6">
        Pilih ruangan untuk lihat jadwal kosong dan buat booking.
      </p>

      {loading && <p className="text-muted">Memuat daftar ruangan...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && resources.length === 0 && (
        <div className="card text-center text-muted py-10">
          Belum ada ruangan yang tersedia saat ini.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((r) => (
          <Link
            key={r.id}
            to={`/resources/${r.id}`}
            className="card hover:border-primary-light transition-colors"
          >
            <h2 className="font-display font-semibold text-lg">{r.name}</h2>
            <p className="text-sm text-muted mt-1">
              Kapasitas {r.capacity} orang
              {r.location ? ` · ${r.location}` : ""}
            </p>
            <span className="inline-block mt-4 text-sm text-primary font-medium">
              Lihat jadwal &amp; booking →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
