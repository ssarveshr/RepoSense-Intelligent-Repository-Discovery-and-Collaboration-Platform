/**
 * Normalize a LiveKit server URL to wss:// or ws:// form.
 * Rejects HTTP API URLs accidentally passed as the LiveKit URL.
 */
export function normalizeLiveKitUrl(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      const path = parsed.pathname === '/' ? '' : parsed.pathname;
      return `wss://${parsed.host}${path}${parsed.search}`;
    }
    if (parsed.protocol === 'http:') {
      const path = parsed.pathname === '/' ? '' : parsed.pathname;
      return `ws://${parsed.host}${path}${parsed.search}`;
    }
    if (parsed.protocol === 'wss:' || parsed.protocol === 'ws:') {
      return trimmed;
    }
  } catch {
    return null;
  }

  return null;
}

/** Prefer join API livekit_url; fall back to VITE_LIVEKIT_URL. */
export function resolveLiveKitUrl(joinData) {
  const fromJoin = normalizeLiveKitUrl(joinData?.livekit_url);
  if (fromJoin) return fromJoin;
  return normalizeLiveKitUrl(import.meta.env.VITE_LIVEKIT_URL);
}

export function formatLiveKitConnectError(error) {
  if (!error) return 'Unable to connect to the meeting.';
  const message = error.message || String(error);
  if (/timed out/i.test(message)) {
    return `${message} LiveKit connects directly from your browser — verify firewall/VPN settings.`;
  }
  if (/invalid livekit url/i.test(message) || /missing livekit token/i.test(message)) {
    return message;
  }
  if (/invalid token|invalid access token|unauthorized|401/i.test(message)) {
    return 'Unable to connect to LiveKit: invalid access token. Ask the host to verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET match the LiveKit Cloud project for wss://reposense-meetings-18f7x8bu.livekit.cloud, then restart the backend.';
  }
  return message || 'Unable to connect to the meeting.';
}
