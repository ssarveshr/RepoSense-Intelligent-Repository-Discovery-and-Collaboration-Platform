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

export default function MeetingChat({ sessionRef, displayName, open, onClose, isMobile = false }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return undefined;

    const unsubscribe = session.onChatMessage((message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [sessionRef]);

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
    if (!draft.trim() || !sessionRef.current) return;
    await sessionRef.current.sendChatMessage(draft, displayName);
    setDraft('');
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
      className={`flex flex-col bg-gray-900 border-gray-800 overflow-hidden ${
        isMobile
          ? mobilePanelClass
          : 'w-[340px] shrink-0 border-l h-full'
      }`}
      role="dialog"
      aria-label="In-call messages"
    >
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900/95 backdrop-blur-md">
        <h2 className="text-white text-sm font-bold">In-call messages</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close messages"
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <ChatIcon className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No messages yet</p>
            <p className="text-gray-500 text-xs mt-1">Send a message to everyone in this meeting</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex flex-col ${message.isLocal ? 'items-end' : 'items-start'}`}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 px-1">
                {message.sender} · {message.time}
              </div>
              <div
                className={`px-3.5 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed ${
                  message.isLocal
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-gray-800 text-gray-100 rounded-bl-md'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-800 flex gap-2 bg-gray-900/95">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message…"
          rows={1}
          aria-label="Message input"
          className="flex-1 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[42px] max-h-24"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0 self-end"
        >
          <SendIcon className="w-5 h-5" />
        </button>
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
