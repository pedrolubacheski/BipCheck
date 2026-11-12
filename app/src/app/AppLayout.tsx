import { NavLink, Outlet, useLocation } from 'react-router';
import { SignOutButton } from '@/features/auth/index.ts';
import { roleLabels, useCompanies } from '@/features/companies/index.ts';
import {
  IconBoardings,
  IconOffline,
  IconReader,
  IconStudents,
  IconTeam,
  IconVan,
} from '@/shared/components/icons.tsx';
import { useOnline } from '@/shared/hooks/useOnline.ts';

// Só o dono tem menu. O motorista usa uma tela só (Embarques) e não precisa navegar.
const ownerLinks = [
  { to: '/boardings', label: 'Embarques', Icon: IconBoardings },
  { to: '/students', label: 'Alunos', Icon: IconStudents },
  { to: '/vans', label: 'Vans', Icon: IconVan },
  { to: '/devices', label: 'Leitores', Icon: IconReader },
  { to: '/team', label: 'Equipe', Icon: IconTeam },
];

// No celular: barra fixa embaixo, ao alcance do polegar, sempre com ícone e nome
function BottomNav() {
  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(15_23_42/0.08)] md:hidden"
    >
      {ownerLinks.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-16 flex-col items-center justify-center gap-0.5 border-t-4 text-[0.8125rem] font-semibold tracking-tight transition-colors duration-150 ${isActive ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-transparent text-slate-700 active:bg-slate-100'}`
          }
        >
          <Icon className="size-6" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

// Em tablet e computador: o mesmo menu, na lateral
function SideNav() {
  return (
    <nav
      aria-label="Menu principal"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-slate-300 bg-white p-3 md:flex"
    >
      {ownerLinks.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-14 items-center gap-3 rounded-xl px-4 text-lg font-semibold transition-colors duration-150 ${isActive ? 'bg-emerald-100 text-emerald-900 shadow-sm' : 'text-slate-800 hover:bg-slate-100'}`
          }
        >
          <Icon className="size-6" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { memberships, current, select } = useCompanies();
  const online = useOnline();
  const { pathname } = useLocation();
  const isOwner = current?.role === 'owner';

  return (
    <div className="min-h-dvh md:flex">
      {isOwner && <SideNav />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 bg-emerald-700 pt-[env(safe-area-inset-top)] text-white shadow-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
            <div className="min-w-0">
              <p className="text-xl leading-tight font-bold">BipCheck</p>
              {current && (
                <p className="truncate text-base text-emerald-50">
                  {current.companyName} · {roleLabels[current.role]}
                </p>
              )}
            </div>
            <SignOutButton className="border-2 border-emerald-200 text-white hover:bg-emerald-800" />
          </div>
        </header>

        {!online && (
          <output className="flex items-center justify-center gap-3 bg-amber-200 px-4 py-3 text-base font-semibold text-amber-950">
            <IconOffline className="size-6" />
            Sem internet. A tela volta a atualizar quando o sinal voltar.
          </output>
        )}

        <main
          className={`mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pt-5 ${isOwner ? 'pb-28 md:pb-10' : 'pb-10'}`}
        >
          {memberships.length > 1 && (
            <label className="flex flex-col gap-1.5 text-base font-semibold text-slate-800">
              Empresa
              <select
                className="min-h-12 rounded-xl border-2 border-slate-400 bg-white px-3 text-lg font-normal text-slate-900"
                value={current?.companyId}
                onChange={(e) => select(e.target.value)}
              >
                {memberships.map((m) => (
                  <option key={m.companyId} value={m.companyId}>
                    {m.companyName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {/* A chave faz cada tela entrar com uma animação curta ao trocar de aba */}
          <div key={pathname} className="animate-rise flex flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </div>
      {isOwner && <BottomNav />}
    </div>
  );
}
