export const MEETINGS_SECTION_PREFIXES = [
  '/meetings',
  '/collaboration',
  '/zoom-meeting',
  '/meeting-lobby-preview',
];

export function pathMatchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isMeetingsNavPath(pathname) {
  return MEETINGS_SECTION_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

export function isNavPathActive(pathname, to, { end = false, matchPrefixes = [] } = {}) {
  if (matchPrefixes.some((prefix) => pathMatchesPrefix(pathname, prefix))) {
    return true;
  }
  if (end) {
    return pathname === to;
  }
  return pathMatchesPrefix(pathname, to);
}
