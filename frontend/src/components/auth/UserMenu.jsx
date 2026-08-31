import { useEffect, useId, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { SignedIn, useClerk, useUser } from '@clerk/clerk-react';

import UserAvatar from './UserAvatar';

import { getClerkDisplayName } from '../profile/profileUtils';

import UsernameDisplay from '../profile/UsernameDisplay';

import { useProfileAuth } from '../../providers/profileAuthContext.js';



function UserMenuPanel({ onClose }) {

  const menuId = useId();

  const { user } = useUser();

  const { signOut } = useClerk();

  const navigate = useNavigate();

  const { usernameSetupState } = useProfileAuth();



  const displayName = getClerkDisplayName(user);



  const handleSignOut = async () => {

    onClose();

    await signOut({ redirectUrl: '/' });

  };



  const handleProfile = () => {

    onClose();

    navigate('/profile');

  };



  return (

    <div

      id={menuId}

      role="menu"

      aria-label="User menu"

      className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-2 z-50"

    >

      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">

        <UserAvatar user={user} size="md" />

        <div className="min-w-0">

          {displayName && (

            <p className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>

          )}

          <UsernameDisplay

            user={user}

            setupState={usernameSetupState}

            className="text-sm text-gray-500 dark:text-gray-400 truncate"

          />

        </div>

      </div>



      <div className="py-1">

        <button

          type="button"

          role="menuitem"

          onClick={handleProfile}

          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800"

        >

          Your profile

        </button>

      </div>



      <div className="border-t border-gray-100 dark:border-gray-800 py-1">

        <button

          type="button"

          role="menuitem"

          onClick={handleSignOut}

          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800"

        >

          Sign out

        </button>

      </div>

    </div>

  );

}



export default function UserMenu() {

  const [open, setOpen] = useState(false);

  const containerRef = useRef(null);

  const { user } = useUser();



  useEffect(() => {

    if (!open) return undefined;



    const handlePointerDown = (event) => {

      if (containerRef.current && !containerRef.current.contains(event.target)) {

        setOpen(false);

      }

    };



    const handleKeyDown = (event) => {

      if (event.key === 'Escape') setOpen(false);

    };



    document.addEventListener('mousedown', handlePointerDown);

    document.addEventListener('keydown', handleKeyDown);

    return () => {

      document.removeEventListener('mousedown', handlePointerDown);

      document.removeEventListener('keydown', handleKeyDown);

    };

  }, [open]);



  return (

    <SignedIn>

      <div ref={containerRef} className="relative">

        <button

          type="button"

          onClick={() => setOpen((value) => !value)}

          aria-expanded={open}

          aria-haspopup="menu"

          aria-label="Open user menu"

          className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"

        >

          <UserAvatar user={user} size="sm" />

        </button>

        {open && <UserMenuPanel onClose={() => setOpen(false)} />}

      </div>

    </SignedIn>

  );

}

