import { Link } from 'react-router-dom';
import { useProfileAuth } from '../../providers/profileAuthContext.js';
import UserAvatar from './UserAvatar';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950';

export default function UserMenu() {
  const { user, isSignedIn } = useProfileAuth();

  if (!isSignedIn) {
    return null;
  }

  return (
    <Link
      to="/profile"
      aria-label="Open profile"
      className={`cursor-pointer rounded-full p-0.5 min-h-10 min-w-10 inline-flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 ${focusRing}`}
    >
      <UserAvatar user={user} size="md" />
    </Link>
  );
}
