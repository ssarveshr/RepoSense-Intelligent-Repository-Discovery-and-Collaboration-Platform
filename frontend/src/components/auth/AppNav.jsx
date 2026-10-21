import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useProfileAuth } from '../../providers/profileAuthContext.js';
import UserMenu from './UserMenu';
import { isNavPathActive } from './navRoutes.js';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950';

const desktopLinkBase = `cursor-pointer whitespace-nowrap rounded-full px-2.5 md:px-3 lg:px-3.5 py-1.5 text-[15px] font-medium transition-colors duration-150 motion-reduce:transition-none ${focusRing}`;
const desktopLinkIdle =
  'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700/80 hover:text-gray-900 dark:hover:text-white';
const desktopLinkActive = 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300';

const mobileLinkBase = `cursor-pointer block w-full text-left px-3 py-3 rounded-xl text-base font-medium transition-colors duration-150 motion-reduce:transition-none ${focusRing}`;
const mobileLinkIdle = 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800';
const mobileLinkActive = 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300';

const signUpDesktopIdle = `cursor-pointer whitespace-nowrap rounded-full px-3 lg:px-3.5 py-1.5 text-[15px] font-semibold bg-blue-600 text-white hover:bg-blue-700 ${focusRing}`;
const signUpDesktopActive = `cursor-pointer whitespace-nowrap rounded-full px-3 lg:px-3.5 py-1.5 text-[15px] font-semibold bg-blue-700 text-white ring-2 ring-blue-500/40 ${focusRing}`;

function MenuIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function joinClasses(...parts) {
  return parts.filter(Boolean).join(' ');
}

function AppNavLink({
  to,
  children,
  onNavigate,
  end = false,
  matchPrefixes = [],
  idleClassName,
  activeClassName,
}) {
  const { pathname } = useLocation();
  const active = isNavPathActive(pathname, to, { end, matchPrefixes });

  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={joinClasses(active ? activeClassName : idleClassName)}
    >
      {children}
    </Link>
  );
}

function AuthenticatedNavLinks({ onNavigate, mobile = false, includeProfile = false }) {
  const idle = mobile ? joinClasses(mobileLinkBase, mobileLinkIdle) : joinClasses(desktopLinkBase, desktopLinkIdle);
  const active = mobile ? joinClasses(mobileLinkBase, mobileLinkActive) : joinClasses(desktopLinkBase, desktopLinkActive);

  return (
    <>
      <AppNavLink
        to="/"
        end
        onNavigate={onNavigate}
        idleClassName={idle}
        activeClassName={active}
      >
        Discover
      </AppNavLink>
      <AppNavLink
        to="/github-summarizer"
        onNavigate={onNavigate}
        idleClassName={idle}
        activeClassName={active}
      >
        GitHub Summarizer
      </AppNavLink>
      <AppNavLink
        to="/ai-agent"
        onNavigate={onNavigate}
        idleClassName={idle}
        activeClassName={active}
      >
        AI Code Agent
      </AppNavLink>
      <AppNavLink
        to="/meetings"
        matchPrefixes={['/meetings', '/collaboration', '/zoom-meeting', '/meeting-lobby-preview']}
        onNavigate={onNavigate}
        idleClassName={idle}
        activeClassName={active}
      >
        Meetings
      </AppNavLink>
      {includeProfile ? (
        <AppNavLink
          to="/profile"
          onNavigate={onNavigate}
          idleClassName={idle}
          activeClassName={active}
        >
          Profile
        </AppNavLink>
      ) : null}
    </>
  );
}

function PublicNavLinks({ onNavigate, mobile = false, prominentSignUp = true }) {
  const { pathname } = useLocation();
  const idle = mobile ? joinClasses(mobileLinkBase, mobileLinkIdle) : joinClasses(desktopLinkBase, desktopLinkIdle);
  const active = mobile ? joinClasses(mobileLinkBase, mobileLinkActive) : joinClasses(desktopLinkBase, desktopLinkActive);
  const signUpIdle = prominentSignUp ? signUpDesktopIdle : idle;
  const signUpActive = prominentSignUp ? signUpDesktopActive : active;
  const signUpIsActive = isNavPathActive(pathname, '/sign-up');

  return (
    <>
      <AppNavLink
        to="/"
        end
        onNavigate={onNavigate}
        idleClassName={idle}
        activeClassName={active}
      >
        Home
      </AppNavLink>
      <AppNavLink
        to="/sign-in"
        onNavigate={onNavigate}
        idleClassName={idle}
        activeClassName={active}
      >
        Sign In
      </AppNavLink>
      <Link
        to="/sign-up"
        onClick={onNavigate}
        aria-current={signUpIsActive ? 'page' : undefined}
        className={signUpIsActive ? signUpActive : signUpIdle}
      >
        Sign Up
      </Link>
    </>
  );
}

function DesktopNavCluster({ children }) {
  return (
    <nav
      aria-label="Primary"
      className="hidden md:inline-flex items-center gap-0.5 lg:gap-1 min-h-[48px] px-1 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/70 shadow-sm"
    >
      {children}
    </nav>
  );
}

function ClerkDesktopNav() {
  return (
    <DesktopNavCluster>
      <SignedOut>
        <PublicNavLinks />
      </SignedOut>
      <SignedIn>
        <AuthenticatedNavLinks />
      </SignedIn>
    </DesktopNavCluster>
  );
}

function FallbackDesktopNav() {
  const { isSignedIn } = useProfileAuth();

  return (
    <DesktopNavCluster>
      {isSignedIn ? <AuthenticatedNavLinks /> : <PublicNavLinks />}
    </DesktopNavCluster>
  );
}

function MobileNavPanel({ panelId, isSignedIn, clerkEnabled, onClose, onDismiss }) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 top-[66px] z-40 bg-gray-950/40 md:hidden"
        aria-label="Dismiss navigation menu"
        onClick={onDismiss || onClose}
      />
      <div
        id={panelId}
        className="fixed inset-x-0 top-[66px] z-50 md:hidden px-4 pb-4"
      >
        <div className="mx-auto max-w-7xl max-h-[min(70vh,calc(100vh-5rem))] overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-3">
          <nav aria-label="Mobile primary" className="flex flex-col gap-1">
            {clerkEnabled ? (
              <>
                <SignedOut>
                  <PublicNavLinks onNavigate={onClose} mobile prominentSignUp={false} />
                </SignedOut>
                <SignedIn>
                  <AuthenticatedNavLinks onNavigate={onClose} mobile includeProfile />
                </SignedIn>
              </>
            ) : (
              isSignedIn
                ? <AuthenticatedNavLinks onNavigate={onClose} mobile includeProfile />
                : <PublicNavLinks onNavigate={onClose} mobile prominentSignUp={false} />
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

function MobileNav({ clerkEnabled, isSignedIn }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { pathname } = useLocation();
  const toggleRef = useRef(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    restoreFocusRef.current = false;
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        restoreFocusRef.current = true;
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const panel = document.getElementById(panelId);
      const firstControl = panel?.querySelector('a, button');
      firstControl?.focus();
      return;
    }
    if (restoreFocusRef.current) {
      toggleRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [open, panelId]);

  const toggle = () => {
    setOpen((value) => {
      if (value) restoreFocusRef.current = true;
      return !value;
    });
  };
  const close = ({ restoreFocus = false } = {}) => {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
  };

  return (
    <div className="md:hidden">
      <button
        ref={toggleRef}
        type="button"
        className={`cursor-pointer p-2 min-h-10 min-w-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      {open ? (
        <MobileNavPanel
          panelId={panelId}
          isSignedIn={isSignedIn}
          clerkEnabled={clerkEnabled}
          onClose={() => close({ restoreFocus: false })}
          onDismiss={() => close({ restoreFocus: true })}
        />
      ) : null}
    </div>
  );
}

export function AppNav() {
  const { clerkEnabled } = useProfileAuth();
  return clerkEnabled ? <ClerkDesktopNav /> : <FallbackDesktopNav />;
}

export function AppMobileNav() {
  const { clerkEnabled, isSignedIn } = useProfileAuth();
  return <MobileNav clerkEnabled={clerkEnabled} isSignedIn={isSignedIn} />;
}

export function AppUserMenu() {
  const { clerkEnabled } = useProfileAuth();
  if (!clerkEnabled) return null;
  return <UserMenu />;
}
