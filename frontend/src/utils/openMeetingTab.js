const MEETING_LOADING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RepoSense Meet</title>
  <style>
    html, body { height: 100%; margin: 0; background: #030712; color: #e5e7eb; font-family: system-ui, sans-serif; }
    .wrap { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; }
    .spin { width: 36px; height: 36px; border: 3px solid #6366f1; border-top-color: transparent; border-radius: 9999px; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="spin" aria-hidden="true"></div>
    <p>Opening RepoSense Meet…</p>
  </div>
</body>
</html>`;

export function getMeetingUrl(meetingId) {
  return `${window.location.origin}/meetings/${encodeURIComponent(meetingId)}`;
}

export function openMeetingInNewTab(meetingId) {
  const url = getMeetingUrl(meetingId);
  return window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a placeholder tab synchronously from a user click, then navigate once the meeting id is known.
 * Falls back to a direct open if the placeholder tab was blocked.
 */
export function openMeetingTabPlaceholder() {
  const tab = window.open('about:blank', '_blank', 'noopener,noreferrer');
  if (tab) {
    try {
      tab.document.open();
      tab.document.write(MEETING_LOADING_HTML);
      tab.document.close();
    } catch {
      // Cross-origin restrictions should not apply to about:blank.
    }
  }
  return tab;
}

export function navigateMeetingTab(tab, meetingId) {
  const url = getMeetingUrl(meetingId);
  if (tab && !tab.closed) {
    tab.location.href = url;
    tab.focus?.();
    return tab;
  }
  return openMeetingInNewTab(meetingId);
}
