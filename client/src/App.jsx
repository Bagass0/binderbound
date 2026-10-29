import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { RequireSet } from './components/layout/RequireSet.jsx';
import { RouteError } from './components/layout/RouteError.jsx';
import SetSelectPage from './pages/SetSelectPage.jsx';

// Les étapes suivantes sont chargées à la demande : la page d'accueil reste légère.
const page = (load) => () => load().then((m) => ({ Component: m.default }));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <SetSelectPage /> },
      {
        element: <RequireSet />,
        children: [
          { path: 'binder', lazy: page(() => import('./pages/BinderSetupPage.jsx')) },
          { path: 'options', lazy: page(() => import('./pages/OptionsPage.jsx')) },
          { path: 'result', lazy: page(() => import('./pages/ResultPage/index.jsx')) },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
