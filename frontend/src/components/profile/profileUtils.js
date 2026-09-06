export function getInitials(name) {
  if (!name?.trim()) return '';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function getClerkDisplayName(user) {
  if (!user) return '';
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;

  const composed = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (composed) return composed;

  if (user.username) return user.username;

  const email = user.primaryEmailAddress?.emailAddress;
  if (email?.includes('@')) return email.split('@')[0];

  return '';
}

export function getClerkUsernameHandle(user) {
  if (!user?.username) return null;
  return `@${user.username}`;
}

export function getClerkEmail(user) {
  return user?.primaryEmailAddress?.emailAddress || '';
}

export function getInitialsFromUser(user) {
  const fullName = user?.fullName?.trim();
  const composed = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const name = fullName || composed;
  if (name) return getInitials(name);

  if (user?.username) {
    return user.username.slice(0, 2).toUpperCase();
  }

  const email = getClerkEmail(user);
  if (email) return email[0].toUpperCase();

  return '';
}

export function truncateMiddle(value, startChars = 12, endChars = 4) {
  if (!value) return '';
  if (value.length <= startChars + endChars + 1) return value;
  return `${value.slice(0, startChars)}…${value.slice(-endChars)}`;
}

export const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function validateProfileImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Please choose a supported image file.' };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Please choose a supported image file.' };
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return { valid: false, error: 'Image is too large.' };
  }

  return { valid: true, error: null };
}

export function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return 'Just now';

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  const diffWeek = Math.round(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
