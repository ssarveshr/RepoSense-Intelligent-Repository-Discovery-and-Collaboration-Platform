import { Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useProfileAuth } from '../../providers/profileAuthContext.js';
import UserMenu from './UserMenu';

function AuthenticatedNavLinks() {
  return (
    <>
      <Link to="/" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Discover</Link>
      <Link to="/github-summarizer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">GitHub Summarizer</Link>
      <Link to="/ai-agent" className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
        <span>⚡ AI Code Agent</span>
      </Link>
      <Link to="/meetings" className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-500/20 transition-all">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>Meetings</span>
      </Link>
    </>
  );
}

function PublicNavLinks() {
  return (
    <>
      <Link to="/" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Home</Link>
      <Link to="/sign-in" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Sign In</Link>
      <Link
        to="/sign-up"
        className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
      >
        Sign Up
      </Link>
    </>
  );
}

function ClerkAppNav() {
  return (
    <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
      <SignedOut>
        <PublicNavLinks />
      </SignedOut>
      <SignedIn>
        <AuthenticatedNavLinks />
      </SignedIn>
    </div>
  );
}

function FallbackAppNav() {
  const { isSignedIn } = useProfileAuth();

  return (
    <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
      {isSignedIn ? <AuthenticatedNavLinks /> : <PublicNavLinks />}
    </div>
  );
}

export function AppNav() {
  const { clerkEnabled } = useProfileAuth();
  return clerkEnabled ? <ClerkAppNav /> : <FallbackAppNav />;
}

export function AppUserMenu() {
  const { clerkEnabled } = useProfileAuth();
  if (!clerkEnabled) return null;
  return <UserMenu />;
}
