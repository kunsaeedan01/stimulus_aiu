import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-600">
        Apply for Publication Incentive
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/profile" className="text-sm text-gray-700 hover:text-blue-600">
                {user.full_name || user.email}
              </Link>
              {user.is_staff && (
                <Link to="/admin/applications" className="text-sm text-purple-600 hover:underline">
                  Админка
                </Link>
              )}
            </>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Войти
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}