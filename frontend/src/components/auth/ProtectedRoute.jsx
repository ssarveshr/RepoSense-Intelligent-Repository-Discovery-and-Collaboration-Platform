import { Navigate, useLocation } from 'react-router-dom';
import { useProfileAuth } from '../../providers/profileAuthContext.js';

function AuthLoading() {
  return (
    <div className="max-w-3xl mx-auto py-24 text-center">
      <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Checking authentication…</p>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useProfileAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return children;
}
