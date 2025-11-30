import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const { logout, loading } = useAuth();
  const navigate = useNavigate();

  const handle = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
    >
      {loading ? "Выход..." : "Выйти"}
    </button>
  );
}
