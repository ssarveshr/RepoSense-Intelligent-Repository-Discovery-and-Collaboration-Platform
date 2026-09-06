import { getPublicFrontendBaseUrl } from './frontendBaseUrl.js';

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

export function logMeetLaunch(stage, details = {}) {
  console.info('[RepoSense Meet]', stage, details);
}

export function getMeetingUrl(meetingId) {
  const normalizedId = typeof meetingId === 'string' ? meetingId.trim() : '';
  if (!normalizedId) return '';
  const base = getPublicFrontendBaseUrl() || window.location.origin;
  return `${base.replace(/\/+$/, '')}/meetings/${encodeURIComponent(normalizedId)}`;
}

export function closeMeetingTab(tab) {
  if (tab && !tab.closed) {
    try {
      tab.close();
    } catch {
      // Best-effort cleanup when resolve/navigation fails.
    }
  }
}

function writeLoadingPage(tab) {
  if (!tab) return false;
  try {
    tab.document.open();
    tab.document.write(MEETING_LOADING_HTML);
    tab.document.close();
    return true;
  } catch (error) {
    logMeetLaunch('loading_page_write_failed', {
      error: error?.message || 'unknown',
    });
    return false;
  }
}

/**
 * Open a placeholder tab synchronously from a user click.
 * Must NOT use noopener — the opener navigates this tab after async work completes.
 */
export function openMeetingTabPlaceholder() {
  const tab = window.open('', '_blank');
  logMeetLaunch('placeholder_opened', {
    tabPresent: Boolean(tab),
    tabClosed: tab?.closed ?? null,
  });
  if (tab) {
    writeLoadingPage(tab);
  }
  return tab;
}

function navigateTabLocation(tab, url) {
  const attempts = [
    () => {
      tab.location.href = url;
    },
    () => {
      tab.location.assign(url);
    },
    () => {
      tab.location.replace(url);
    },
  ];

  let lastError = null;
  for (const attempt of attempts) {
    try {
      attempt();
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  logMeetLaunch('tab_navigation_failed', {
    url,
    error: lastError?.message || 'unknown',
  });
  return false;
}

export function openMeetingInNewTab(meetingId) {
  const url = getMeetingUrl(meetingId);
  if (!url) {
    logMeetLaunch('direct_open_skipped', { reason: 'missing_meeting_id' });
    return null;
  }
  logMeetLaunch('direct_open', { url });
  return window.open(url, '_blank', 'noopener,noreferrer');
}

export function navigateMeetingTab(tab, meetingId) {
  const normalizedId = typeof meetingId === 'string' ? meetingId.trim() : '';
  if (!normalizedId) {
    logMeetLaunch('navigation_skipped', { reason: 'missing_meeting_id' });
    closeMeetingTab(tab);
    return null;
  }

  const url = getMeetingUrl(normalizedId);
  logMeetLaunch('navigating_tab', {
    meetingId: normalizedId,
    url,
    tabPresent: Boolean(tab),
    tabClosed: tab?.closed ?? null,
  });

  if (tab && !tab.closed) {
    if (navigateTabLocation(tab, url)) {
      tab.focus?.();
      logMeetLaunch('navigation_succeeded', { meetingId: normalizedId, url });
      return tab;
    }
  }

  logMeetLaunch('navigation_fallback_direct_open', { meetingId: normalizedId, url });
  closeMeetingTab(tab);
  return openMeetingInNewTab(normalizedId);
}

/** Synchronous user-gesture launch when the meeting id is already known. */
export function launchMeetingInNewTab(meetingId) {
  const tab = openMeetingTabPlaceholder();
  return navigateMeetingTab(tab, meetingId);
}

/** Navigate a placeholder tab after async meeting resolution. */
export async function launchMeetingTabAfterResolve(tab, meetingPromise) {
  try {
    const meeting = await meetingPromise;
    const meetingId = meeting?.id ?? meeting?.meeting_id ?? null;
    logMeetLaunch('meeting_resolved', { meetingIdPresent: Boolean(meetingId) });
    if (!meetingId) {
      throw new Error('Meeting could not be resolved.');
    }
    return navigateMeetingTab(tab, meetingId);
  } catch (error) {
    logMeetLaunch('meeting_resolve_failed', {
      error: error?.message || 'unknown',
    });
    closeMeetingTab(tab);
    throw error;
  }
}
