/**
 * Public frontend URL for shareable links (meet join, etc.).
 * Prefer VITE_FRONTEND_BASE_URL when deployed behind Cloudflare or another public host.
 */
export function getPublicFrontendBaseUrl() {
  const configured = import.meta.env.VITE_FRONTEND_BASE_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function buildMeetJoinUrl(shortCode) {
  if (!shortCode) return '';
  const base = getPublicFrontendBaseUrl();
  return `${base}/meet/join/${encodeURIComponent(shortCode)}`;
}
