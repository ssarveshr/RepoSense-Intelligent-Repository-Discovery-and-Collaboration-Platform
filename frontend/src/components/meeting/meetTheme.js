/** Shared neutral dark palette for standalone Meet UI. */
export const MEET_AVATAR_GRADIENTS = [
  'from-zinc-700 to-zinc-800',
  'from-neutral-700 to-neutral-800',
  'from-stone-700 to-stone-800',
  'from-gray-700 to-gray-800',
];

export function meetAvatarGradient(name) {
  const hash = (name || '?').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return MEET_AVATAR_GRADIENTS[hash % MEET_AVATAR_GRADIENTS.length];
}

export const meetTheme = {
  bgRoot: 'bg-[#0B0D10]',
  bgStage: 'bg-[#101318]',
  bgHeader: 'bg-[#111419]',
  bgPanel: 'bg-[#161A20]',
  bgControls: 'bg-[#1C2128]',
  bgControlHover: 'bg-[#252B33]',
  borderSubtle: 'border-[#2B3038]',
  textPrimary: 'text-[#F3F4F6]',
  textSecondary: 'text-[#9CA3AF]',
  textMuted: 'text-[#6B7280]',
  controlBar:
    'bg-[#1C2128]/95 backdrop-blur-xl border border-[#2B3038] rounded-full shadow-lg',
  btnNeutral:
    'bg-[#1C2128] text-[#F3F4F6] hover:bg-[#252B33] border border-[#2B3038] focus:outline-none focus:ring-2 focus:ring-white/15',
  btnActive:
    'bg-[#252B33] text-[#F3F4F6] hover:bg-[#2B3038] ring-1 ring-[#2B3038] border border-[#2B3038] focus:outline-none focus:ring-2 focus:ring-white/20',
  btnMuted:
    'bg-[#1C2128] text-red-300/90 hover:bg-[#252B33] border border-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-900/30',
  btnShareActive:
    'bg-[#252B33] text-[#F3F4F6] hover:bg-[#2B3038] ring-1 ring-[#2B3038] border border-[#2B3038] focus:outline-none focus:ring-2 focus:ring-white/20',
  btnDestructive:
    'bg-red-900/80 hover:bg-red-900 text-red-100 border border-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-900/40',
  btnEndMeeting:
    'bg-red-950/80 hover:bg-red-900 text-red-100 border border-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-900/40',
  input:
    'bg-[#161A20] border border-[#2B3038] text-[#F3F4F6] placeholder:text-[#6B7280] focus:ring-2 focus:ring-white/10 focus:border-[#2B3038] outline-none',
  messageLocal: 'bg-[#252B33] text-[#F3F4F6] border border-[#2B3038]',
  messageRemote: 'bg-[#161A20] text-[#F3F4F6] border border-[#2B3038]',
  sendBtn:
    'bg-[#252B33] hover:bg-[#2B3038] disabled:opacity-40 text-[#F3F4F6] border border-[#2B3038] focus:outline-none focus:ring-2 focus:ring-white/15',
  card: 'bg-[#161A20] border border-[#2B3038]',
  primaryAction:
    'bg-[#252B33] hover:bg-[#2B3038] text-[#F3F4F6] font-bold focus:outline-none focus:ring-2 focus:ring-white/15',
  statusConnected: 'bg-[#161A20] text-[#9CA3AF] border border-[#2B3038]',
  statusDotConnected: 'bg-green-600/80',
  statusReconnecting: 'bg-[#161A20] text-[#9CA3AF] border border-[#2B3038]',
  statusDotReconnecting: 'bg-amber-600/80',
};
