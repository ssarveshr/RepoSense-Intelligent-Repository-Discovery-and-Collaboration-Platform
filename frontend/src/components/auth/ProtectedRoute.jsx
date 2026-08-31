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
  const { clerkEnabled, isLoaded, isSignedIn } = useProfileAuth();
  const location = useLocation();

  if (!clerkEnabled) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Authentication required</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Configure Clerk to access RepoSense. Set{' '}
          <code className="font-mono">VITE_CLERK_PUBLISHABLE_KEY</code> in the frontend environment.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return children;
}
