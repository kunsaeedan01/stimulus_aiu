import Navbar from "./Navbar";

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500">
          © {new Date().getFullYear()} Apply for Publication Incentive
        </div>
      </footer>
    </div>
  );
}
