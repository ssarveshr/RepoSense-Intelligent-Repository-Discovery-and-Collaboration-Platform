import { getClerkUsernameHandle } from './profileUtils';

export default function UsernameDisplay({ user, setupState = 'idle', className = '' }) {
  const handle = getClerkUsernameHandle(user);

  if (handle) {
    return <p className={className}>{handle}</p>;
  }

  if (setupState === 'setting_up') {
    return (
      <p className={`text-gray-400 dark:text-gray-500 italic ${className}`}>
        Setting up username…
      </p>
    );
  }

  return (
    <p className={`text-gray-400 dark:text-gray-500 italic ${className}`}>
      Username not set
    </p>
  );
}
