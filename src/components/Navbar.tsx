import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
