import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/auth-context';
import { DataProvider } from './contexts/data-context';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
        <Toaster />
      </DataProvider>
    </AuthProvider>
  );
}
