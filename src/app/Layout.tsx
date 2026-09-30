import { Link, NavLink, Outlet, useLocation } from "react-router";
import { StorageBanner } from "./StorageBanner";

const tabs = [
  { to: "/", label: "Inicio", end: true },
  { to: "/compras", label: "Compras", end: false },
  { to: "/presupuesto", label: "Presupuesto", end: false },
  { to: "/ajustes", label: "Ajustes", end: false },
];

export function Layout() {
  const { pathname } = useLocation();
  const showFab = pathname === "/" || pathname === "/compras";
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <StorageBanner />
      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-28">
        <Outlet />
      </main>
      {showFab && (
        <Link
          to="/compras/nueva"
          aria-label="Nueva compra"
          className="fixed right-4 bottom-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-3xl text-white shadow-lg"
        >
          +
        </Link>
      )}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
        <ul className="mx-auto flex max-w-2xl">
          {tabs.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `block py-3 text-center text-sm ${isActive ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
