import { SignUp } from '@clerk/clerk-react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export default function SignUpPage() {
  const { clerkEnabled, isLoaded, isSignedIn, signIn } = useProfileAuth();
  const [devName, setDevName] = useState('');
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  if (isLoaded && isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  if (clerkEnabled) {
    return (
      <div className="max-w-md mx-auto py-12">
        <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl={redirectTo} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-16 px-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-2xl flex items-center justify-center mx-auto shadow-sm">
          R
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create RepoSense Account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign up to access collaborative rooms, code reviews, and personal profiles.
          </p>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            value={devName}
            onChange={(e) => setDevName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => signIn(devName.trim() || 'Developer')}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all cursor-pointer"
          >
            Create Developer Account
          </button>
        </div>
        <div className="pt-2">
          <Link to="/sign-in" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
