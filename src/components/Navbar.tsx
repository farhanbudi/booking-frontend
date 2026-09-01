import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adminOpen) return;
    function onClick(e: MouseEvent) {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAdminOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [adminOpen]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-display font-700 text-lg text-primary">
          RoomBook
        </Link>

        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-ink hover:text-primary">
              Ruangan
            </Link>
            <Link to="/my-bookings" className="text-ink hover:text-primary">
              Booking Saya
            </Link>
            {user?.role === "admin" && (
              <div className="relative" ref={adminRef}>
                <button
                  type="button"
                  onClick={() => setAdminOpen((o) => !o)}
                  className="text-ink hover:text-primary inline-flex items-center gap-1"
                  aria-haspopup="menu"
                  aria-expanded={adminOpen}
                >
                  Admin
                  <span aria-hidden className="text-xs">
                    ▾
                  </span>
                </button>
                {adminOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-52 bg-white border border-line rounded-lg shadow-md py-1 z-10"
                  >
                    <Link
                      role="menuitem"
                      to="/admin/resources"
                      onClick={() => setAdminOpen(false)}
                      className="block px-3 py-2 text-ink hover:bg-base"
                    >
                      Kelola Ruangan
                    </Link>
                    <Link
                      role="menuitem"
                      to="/admin/bookings"
                      onClick={() => setAdminOpen(false)}
                      className="block px-3 py-2 text-ink hover:bg-base"
                    >
                      Kelola Booking
                    </Link>
                  </div>
                )}
              </div>
            )}
            <span className="text-muted">Hai, {user.name}</span>
            <button onClick={handleLogout} className="btn-outline !py-1.5 !px-3">
              Keluar
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/login" className="text-ink hover:text-primary">
              Masuk
            </Link>
            <Link to="/register" className="btn-primary !py-1.5 !px-3">
              Daftar
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
