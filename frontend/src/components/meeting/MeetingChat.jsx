import { useEffect, useRef, useState } from 'react';
import {
  CameraIcon,
  CameraOffIcon,
  ChatIcon,
  CloseIcon,
  MicIcon,
  MicOffIcon,
  ScreenShareIcon,
  SendIcon,
} from './MeetingIcons';
import { useMeetLayout } from '../../layouts/meetLayoutContext.js';
import { meetTheme } from './meetTheme.js';

export default function MeetingChat({
  sessionRef,
  displayName,
  open,
  onClose,
  isMobile = false,
  connected = false,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!connected) return undefined;

    const session = sessionRef.current;
    if (!session) return undefined;

    const unsubscribe = session.onChatMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [connected, sessionRef]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !sessionRef.current) return;

    setSendError(null);
    try {
      await sessionRef.current.sendChatMessage(text, displayName);
      setDraft('');
    } catch (error) {
      console.error('Failed to send chat message:', error);
      setSendError('Unable to send message. Check your connection and try again.');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  const { standalone } = useMeetLayout();
  const mobilePanelClass = standalone ? 'fixed inset-0 z-50' : 'fixed inset-0 top-16 z-50';
  const mobileBackdropClass = standalone ? 'fixed inset-0 bg-black/50 z-40' : 'fixed inset-0 top-16 bg-black/50 z-40';

  if (!open) return null;

  const panel = (
    <div
      className={`flex flex-col ${meetTheme.bgPanel} ${meetTheme.borderSubtle} overflow-hidden ${
        isMobile
          ? mobilePanelClass
          : 'w-[340px] shrink-0 border-l h-full'
      }`}
      role="dialog"
      aria-label="In-call messages"
    >
      <div
        className={`px-4 py-3 border-b ${meetTheme.borderSubtle} flex items-center justify-between ${meetTheme.bgPanelHeader} backdrop-blur-md`}
      >
        <h2 className={`${meetTheme.textPrimary} text-sm font-bold`}>In-call messages</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close messages"
          className={`p-2 rounded-lg ${meetTheme.textSecondary} hover:text-white hover:bg-[#242A33] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20`}
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <ChatIcon className="w-10 h-10 text-[#4B5563] mb-3" />
            <p className={`${meetTheme.textSecondary} text-sm font-medium`}>No messages yet</p>
            <p className={`${meetTheme.textMuted} text-xs mt-1`}>Send a message to everyone in this meeting</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex flex-col ${message.isLocal ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] uppercase tracking-wider text-[#737373] mb-1 px-1">
                {message.sender} · {message.time}
              </div>
              <div
                className={`px-3.5 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed ${
                  message.isLocal
                    ? `${meetTheme.messageLocal} rounded-br-md`
                    : `${meetTheme.messageRemote} rounded-bl-md`
                }`}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className={`p-3 border-t ${meetTheme.borderSubtle} flex flex-col gap-2 ${meetTheme.bgPanelHeader}`}
      >
        {sendError && (
          <p className="text-red-400 text-xs px-1" role="alert">
            {sendError}
          </p>
        )}
        <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message…"
          rows={1}
          aria-label="Message input"
          className={`flex-1 px-3 py-2.5 rounded-xl text-sm resize-none min-h-[42px] max-h-24 ${meetTheme.input}`}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className={`p-2.5 rounded-xl transition-colors shrink-0 self-end ${meetTheme.sendBtn}`}
        >
          <SendIcon className="w-5 h-5" />
        </button>
        </div>
      </form>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className={mobileBackdropClass}
          aria-label="Close messages overlay"
          onClick={onClose}
        />
        {panel}
      </>
    );
  }

  return panel;
}
