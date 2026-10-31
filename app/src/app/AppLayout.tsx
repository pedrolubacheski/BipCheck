import { NavLink, Outlet } from 'react-router';
import { signOut } from '@/features/auth/index.ts';
import { roleLabels, useCompanies } from '@/features/companies/index.ts';

const ownerLinks = [
  { to: '/boardings', label: 'Embarques' },
  { to: '/students', label: 'Alunos' },
  { to: '/vans', label: 'Vans' },
  { to: '/devices', label: 'Leitores' },
  { to: '/team', label: 'Equipe' },
];

const driverLinks = [{ to: '/boardings', label: 'Embarques' }];

export function AppLayout() {
  const { memberships, current, select } = useCompanies();
  const links = current?.role === 'owner' ? ownerLinks : driverLinks;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <div>
            <p className="text-lg font-bold">BipCheck</p>
            {current && (
              <p className="text-xs text-emerald-100">
                {current.companyName} · {roleLabels[current.role]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {memberships.length > 1 && (
              <select
                aria-label="Empresa"
                className="rounded bg-emerald-800 px-2 py-1 text-sm"
                value={current?.companyId}
                onChange={(e) => select(e.target.value)}
              >
                {memberships.map((m) => (
                  <option key={m.companyId} value={m.companyId}>
                    {m.companyName}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="text-sm underline" onClick={() => void signOut()}>
              Sair
            </button>
          </div>
        </div>
        {links.length > 1 && (
          <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-white text-emerald-800' : 'text-emerald-50 hover:bg-emerald-600'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-3xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
