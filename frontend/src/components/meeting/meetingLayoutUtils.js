/**
 * Responsive participant grid classes based on tile count and layout context.
 */
export function getParticipantGridClass(count, { chatOpen = false, compact = false } = {}) {
  if (count <= 1) {
    return 'grid-cols-1 max-w-3xl mx-auto w-full items-center';
  }
  if (count === 2) {
    return chatOpen && !compact
      ? 'grid-cols-1 sm:grid-cols-2 w-full items-start'
      : 'grid-cols-1 sm:grid-cols-2 w-full items-start content-center';
  }
  if (count <= 4) {
    return 'grid-cols-1 sm:grid-cols-2 w-full items-start';
  }
  if (count <= 6) {
    return 'grid-cols-2 lg:grid-cols-3 w-full items-start';
  }
  if (count <= 9) {
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 w-full items-start';
  }
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full items-start';
}

export function getThumbnailGridClass(count) {
  if (count <= 2) return 'grid-cols-1';
  if (count <= 4) return 'grid-cols-1';
  return 'grid-cols-1';
}

/**
 * Split tiles into presentation (screen share) and camera thumbnails.
 */
export function splitPresentationTiles(localTile, remoteTiles) {
  const all = [localTile, ...remoteTiles];
  const presenter = all.find((t) => t.isScreenShare && t.stream);
  if (!presenter) {
    return { presenter: null, thumbnails: all };
  }
  const thumbnails = all.filter((t) => t.id !== presenter.id || !t.isScreenShare);
  return { presenter, thumbnails: thumbnails.filter((t) => !t.isScreenShare || t.id !== presenter.id) };
}

export function connectionStatusLabel(state, { Connecting, Connected, Reconnecting, Disconnected }) {
  if (state === Connecting) return 'Connecting…';
  if (state === Reconnecting) return 'Reconnecting…';
  if (state === Connected) return 'Connected';
  if (state === Disconnected) return 'Disconnected';
  return 'Not connected';
}
