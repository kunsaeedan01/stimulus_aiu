import { Link, NavLink } from "react-router-dom";
import LogoutButton from "../../features/auth/LogoutButton";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-gray-900"
          >
            Apply for Publication Incentive
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {user.full_name || user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-200 text-gray-900"
                        : "text-gray-700 hover:bg-gray-100"
                    }`
                  }
                >
                  Войти
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Регистрация
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}  