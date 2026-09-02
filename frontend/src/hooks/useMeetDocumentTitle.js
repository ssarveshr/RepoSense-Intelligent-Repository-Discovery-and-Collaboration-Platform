import { useEffect } from 'react';

const DEFAULT_TITLE = 'RepoSense Meet';

export function useMeetDocumentTitle(meetingTitle, phase) {
  useEffect(() => {
    const previousTitle = document.title;

    if (phase === 'stage') {
      document.title = meetingTitle
        ? `${meetingTitle} — RepoSense Meet`
        : DEFAULT_TITLE;
    } else if (phase === 'lobby') {
      document.title = meetingTitle
        ? `Join ${meetingTitle} — RepoSense Meet`
        : `Join — ${DEFAULT_TITLE}`;
    } else {
      document.title = DEFAULT_TITLE;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [meetingTitle, phase]);
}
