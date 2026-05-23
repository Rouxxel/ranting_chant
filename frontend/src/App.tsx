import { Outlet, Link, Routes, Route } from "react-router-dom";
import { AeroBackground } from "@/components/AeroBackground";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";
import ManagementPage from "@/pages/ManagementPage";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function RootLayout() {
  return (
    <>
      <AeroBackground />
      <div className="relative z-10">
        <Outlet />
      </div>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<LoginPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="management" element={<ManagementPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
