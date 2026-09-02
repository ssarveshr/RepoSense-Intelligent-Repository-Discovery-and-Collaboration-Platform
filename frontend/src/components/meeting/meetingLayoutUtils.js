/**
 * Responsive participant grid classes based on tile count and layout context.
 * Uses min-height: 0 + auto-rows so tiles fill the flexible meeting viewport.
 */
export function getParticipantGridClass(count, { chatOpen = false, compact = false } = {}) {
  const shell = 'grid h-full min-h-0 w-full auto-rows-[minmax(0,1fr)]';

  if (count <= 1) {
    return `${shell} grid-cols-1 place-content-center max-w-5xl mx-auto`;
  }
  if (count === 2) {
    return chatOpen && !compact
      ? `${shell} grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3`
      : `${shell} grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 content-center`;
  }
  if (count <= 4) {
    return `${shell} grid-cols-2 gap-2 sm:gap-3`;
  }
  if (count <= 6) {
    return `${shell} grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3`;
  }
  if (count <= 9) {
    return `${shell} grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3`;
  }
  return `${shell} grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3`;
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
