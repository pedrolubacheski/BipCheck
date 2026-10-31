import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { MembersPage } from '@/features/companies/index.ts';
import { LoadingMessage } from '@/shared/components/Feedback.tsx';
import { AppLayout } from './AppLayout.tsx';
import { RequireAuth, RequireOwner } from './guards.tsx';

// Telas carregadas sob demanda: o motorista não baixa o código das telas do dono
const BoardingsPage = lazy(() =>
  import('@/features/boardings/index.ts').then((m) => ({ default: m.BoardingsPage })),
);
const StudentsPage = lazy(() =>
  import('@/features/students/index.ts').then((m) => ({ default: m.StudentsPage })),
);
const VansPage = lazy(() =>
  import('@/features/vans/index.ts').then((m) => ({ default: m.VansPage })),
);
const DevicesPage = lazy(() =>
  import('@/features/devices/index.ts').then((m) => ({ default: m.DevicesPage })),
);

const page = (element: ReactNode) => <Suspense fallback={<LoadingMessage />}>{element}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/boardings" replace /> },
          { path: 'boardings', element: page(<BoardingsPage />) },
          {
            element: <RequireOwner />,
            children: [
              { path: 'students', element: page(<StudentsPage />) },
              { path: 'vans', element: page(<VansPage />) },
              { path: 'devices', element: page(<DevicesPage />) },
              { path: 'team', element: <MembersPage /> },
            ],
          },
          { path: '*', element: <Navigate to="/boardings" replace /> },
        ],
      },
    ],
  },
]);
