import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import React from 'react';
import LoginPage from './pages/login';
import ReceptionPage from './pages/reception';
import DeskPage from './pages/desk';
import { Layout } from './components/layout';
import { useGetMe } from '@workspace/api-client-react';

setAuthTokenGetter(() => localStorage.getItem('guiche_token'));

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType<any>, allowedRoles?: string[] }) {
  const { data: user, isLoading, error } = useGetMe({ 
    query: { 
      retry: false 
    } 
  });
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (error) {
      localStorage.removeItem("guiche_token");
      setLocation("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  React.useEffect(() => {
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'recepcao') setLocation('/recepcao');
      else setLocation(`/mesa/${user.deskId}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-gray-500 font-bold text-lg">Iniciando sistema...</div>;
  if (!user) return null;

  // Role mismatch — redirect handled by useEffect above, render nothing in the meantime
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;

  return (
    <Layout user={user}>
      <Component user={user} />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Switch>
          <Route path="/" component={LoginPage} />
          <Route path="/recepcao">
            {() => <ProtectedRoute component={ReceptionPage} allowedRoles={['recepcao']} />}
          </Route>
          <Route path="/mesa/:id">
            {() => <ProtectedRoute component={DeskPage} allowedRoles={['mesa', 'recepcao']} />}
          </Route>
          <Route>
            {() => (
              <Layout>
                <div className="p-20 text-center flex flex-col items-center justify-center">
                  <h1 className="text-5xl font-black text-gray-300 mb-4">404</h1>
                  <p className="text-xl font-bold text-gray-600">Página não encontrada no sistema.</p>
                </div>
              </Layout>
            )}
          </Route>
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
