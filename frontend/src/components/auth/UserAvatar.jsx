import { getClerkDisplayName, getInitialsFromUser } from '../profile/profileUtils';

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  xl: 'w-64 h-64 max-w-full aspect-square text-5xl',
};

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const displayName = getClerkDisplayName(user);
  const imageUrl = user?.imageUrl || null;
  const initials = getInitialsFromUser(user);
  const sizeClasses = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={displayName ? `${displayName}'s avatar` : 'User avatar'}
        className={`${sizeClasses} rounded-full object-cover border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden={initials ? undefined : true}
      className={`${sizeClasses} rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 ${className}`}
    >
      {initials ? (
        <span className="font-semibold text-gray-700 dark:text-gray-200">{initials}</span>
      ) : (
        <svg className="w-1/2 h-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )}
    </div>
  );
}
