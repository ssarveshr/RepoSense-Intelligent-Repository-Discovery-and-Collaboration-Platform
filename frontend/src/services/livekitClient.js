import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';
import { RemoteAudioPlayback } from './remoteAudioPlayback.js';

const CHAT_TOPIC = 'reposense-chat';
const REACTION_TOPIC = 'reposense-reaction';
const RAISE_HAND_TOPIC = 'reposense-raise-hand';
const CAPTION_TOPIC = 'reposense-caption';

export const REACTION_DISPLAY_MS = 4000;

/** Decode and parse a LiveKit data payload safely. */
export function parseLiveKitDataPayload(payload) {
  if (!payload) return null;
  try {
    const decoded = new TextDecoder().decode(payload);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Normalize raise-hand payload into { identity, raised }. */
export function parseRaiseHandMessage(parsed, participant) {
  if (!parsed || parsed.type !== 'raise-hand') return null;
  const identity =
    typeof parsed.identity === 'string'
      ? parsed.identity
      : participant?.identity || null;
  if (!identity) return null;
  return { identity, raised: Boolean(parsed.raised) };
}

/** Normalize reaction payload into { identity, emoji, sender }. */
export function parseReactionMessage(parsed, participant) {
  if (!parsed || parsed.type !== 'reaction') return null;
  const emoji = typeof parsed.emoji === 'string' ? parsed.emoji.trim() : '';
  if (!emoji) return null;
  const identity =
    typeof parsed.identity === 'string'
      ? parsed.identity
      : participant?.identity || null;
  if (!identity) return null;
  const sender =
    typeof parsed.sender === 'string'
      ? parsed.sender
      : participant?.name || participant?.identity || 'Guest';
  return { identity, emoji, sender };
}

/** Normalize chat payload into { sender, text }. */
export function parseChatMessage(parsed, participant) {
  if (!parsed || parsed.type !== 'chat') return null;
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (!text) return null;
  const sender =
    typeof parsed.sender === 'string'
      ? parsed.sender
      : participant?.name || participant?.identity || 'Guest';
  return { sender, text };
}

/** Normalize caption payload into { identity, sender, text, final }. */
export function parseCaptionMessage(parsed, participant) {
  if (!parsed || parsed.type !== 'caption') return null;
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (!text) return null;
  const identity =
    typeof parsed.identity === 'string'
      ? parsed.identity
      : participant?.identity || null;
  if (!identity) return null;
  const sender =
    typeof parsed.sender === 'string'
      ? parsed.sender
      : participant?.name || participant?.identity || 'Guest';
  return { identity, sender, text, final: parsed.final !== false };
}

/** Normalize LiveKit active speaker payloads to a stable identity string array. */
export function normalizeActiveSpeakerIdentities(speakers) {
  if (speakers == null) return [];
  if (Array.isArray(speakers)) {
    return speakers
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.identity || item.sid || null;
        return null;
      })
      .filter(Boolean);
  }
  if (typeof speakers === 'object') {
    const identity = speakers.identity || speakers.sid;
    return identity ? [identity] : [];
  }
  return [];
}

/**
 * LiveKit room wrapper. Publishes pre-acquired getUserMedia tracks
 * to avoid a second permission prompt. LiveKit Cloud handles STUN/TURN (Phase 4).
 */
export class LiveKitSession {
  constructor() {
    this.room = null;
    this._stateListeners = new Set();
    this._chatListeners = new Set();
    this._reactionListeners = new Set();
    this._handStateListeners = new Set();
    this._captionListeners = new Set();
    this._screenTrack = null;
    this._disconnecting = false;
    this._remoteAudio = new RemoteAudioPlayback();
  }

  onStateChange(listener) {
    this._stateListeners.add(listener);
    return () => this._stateListeners.delete(listener);
  }

  onChatMessage(listener) {
    this._chatListeners.add(listener);
    return () => this._chatListeners.delete(listener);
  }

  onReaction(listener) {
    this._reactionListeners.add(listener);
    return () => this._reactionListeners.delete(listener);
  }

  onHandState(listener) {
    this._handStateListeners.add(listener);
    return () => this._handStateListeners.delete(listener);
  }

  onCaption(listener) {
    this._captionListeners.add(listener);
    return () => this._captionListeners.delete(listener);
  }

  _emitCaption(caption) {
    this._captionListeners.forEach((listener) => listener(caption));
  }

  _emitReaction(reaction) {
    this._reactionListeners.forEach((listener) => listener(reaction));
  }

  _emitHandState(handState) {
    this._handStateListeners.forEach((listener) => listener(handState));
  }

  _handleDataMessage(payload, participant) {
    const parsed = parseLiveKitDataPayload(payload);
    if (!parsed) return;

    if (parsed.type === 'chat') {
      const chat = parseChatMessage(parsed, participant);
      if (!chat) return;
      this._emitChat({
        id: `${participant?.identity || 'local'}-${Date.now()}`,
        sender: chat.sender,
        text: chat.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLocal: participant?.identity === this.room?.localParticipant?.identity,
      });
      return;
    }

    const reaction = parseReactionMessage(parsed, participant);
    if (reaction) {
      this._emitReaction({
        id: `${reaction.identity}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...reaction,
      });
      return;
    }

    const handState = parseRaiseHandMessage(parsed, participant);
    if (handState) {
      this._emitHandState(handState);
      return;
    }

    const caption = parseCaptionMessage(parsed, participant);
    if (caption) {
      this._emitCaption({
        id: `${caption.identity}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...caption,
      });
    }
  }

  _emitState(state) {
    this._stateListeners.forEach((listener) =>
      listener({
        activeSpeakerIdentities: this._lastActiveSpeakers ?? [],
        ...state,
      }),
    );
  }

  _emitChat(message) {
    this._chatListeners.forEach((listener) => listener(message));
  }

  getConnectionState() {
    return this.room?.state ?? ConnectionState.Disconnected;
  }

  getRemoteParticipants() {
    if (!this.room) return [];
    return Array.from(this.room.remoteParticipants.values());
  }

  getLiveParticipants() {
    if (!this.room) return [];
    const local = this.room.localParticipant;
    const remotes = this.getRemoteParticipants();
    return [local, ...remotes].filter(Boolean);
  }

  async connect({ livekitUrl, token, localStream }) {
    this.room = new Room({ adaptiveStream: true, dynacast: true });

    const notify = (activeSpeakerIdentities) => {
      if (activeSpeakerIdentities) {
        this._lastActiveSpeakers = activeSpeakerIdentities;
      }
      this._emitState({
        connectionState: this.getConnectionState(),
        remoteParticipants: this.getRemoteParticipants(),
        liveParticipants: this.getLiveParticipants(),
      });
    };

    this._lastActiveSpeakers = [];

    this.room.on(RoomEvent.ConnectionStateChanged, notify);
    this.room.on(RoomEvent.ParticipantConnected, notify);
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant?.identity) {
        this._emitHandState({ identity: participant.identity, raised: false });
      }
      notify();
    });
    this.room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        this._remoteAudio.attachTrack(track);
      }
      notify();
    });
    this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
      this._remoteAudio.detachTrack(track);
      notify();
    });
    this.room.on(RoomEvent.TrackMuted, notify);
    this.room.on(RoomEvent.TrackUnmuted, notify);
    this.room.on(RoomEvent.Disconnected, notify);
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      this._lastActiveSpeakers = normalizeActiveSpeakerIdentities(speakers);
      notify(this._lastActiveSpeakers);
    });
    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      this._handleDataMessage(payload, participant);
    });

    await this.room.connect(livekitUrl, token);

    this._remoteAudio.attachRoomRemoteAudio(this.room);

    const videoTrack = localStream?.getVideoTracks()[0];
    const audioTrack = localStream?.getAudioTracks()[0];

    if (videoTrack) {
      await this.room.localParticipant.publishTrack(videoTrack, {
        source: Track.Source.Camera,
        name: 'camera',
      });
      const videoPub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoPub && !videoTrack.enabled) await videoPub.mute();
    }

    if (audioTrack) {
      await this.room.localParticipant.publishTrack(audioTrack, {
        source: Track.Source.Microphone,
        name: 'microphone',
      });
      const audioPub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (audioPub && !audioTrack.enabled) await audioPub.mute();
    }

    notify();
    return this.room;
  }

  async sendChatMessage(text, sender) {
    if (!this.room || !text.trim()) return;
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'chat', text: text.trim(), sender }),
    );
    await this.room.localParticipant.publishData(payload, { reliable: true, topic: CHAT_TOPIC });
    this._emitChat({
      id: `local-${Date.now()}`,
      sender,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isLocal: true,
    });
  }

  async sendReaction(emoji, sender) {
    if (!this.room || !emoji) return;
    const identity = this.room.localParticipant?.identity;
    if (!identity) return;
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'reaction', emoji, sender, identity }),
    );
    await this.room.localParticipant.publishData(payload, { reliable: true, topic: REACTION_TOPIC });
    this._emitReaction({
      id: `local-${Date.now()}`,
      identity,
      emoji,
      sender,
    });
  }

  async sendRaiseHand(raised) {
    if (!this.room) return;
    const identity = this.room.localParticipant?.identity;
    if (!identity) return;
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'raise-hand', raised: Boolean(raised), identity }),
    );
    await this.room.localParticipant.publishData(payload, { reliable: true, topic: RAISE_HAND_TOPIC });
    this._emitHandState({ identity, raised: Boolean(raised) });
  }

  async sendCaption(text, sender, { final = true } = {}) {
    if (!this.room || !text?.trim()) return;
    const identity = this.room.localParticipant?.identity;
    if (!identity) return;
    const payload = new TextEncoder().encode(
      JSON.stringify({
        type: 'caption',
        text: text.trim(),
        sender,
        identity,
        final: Boolean(final),
      }),
    );
    await this.room.localParticipant.publishData(payload, { reliable: true, topic: CAPTION_TOPIC });
  }

  async setMicrophoneEnabled(enabled) {
    const publication = this.room?.localParticipant.getTrackPublication(Track.Source.Microphone);
    const mediaTrack = publication?.track?.mediaStreamTrack;
    if (mediaTrack) mediaTrack.enabled = enabled;
    if (publication) {
      if (enabled) await publication.unmute();
      else await publication.mute();
    }
  }

  async setCameraEnabled(enabled) {
    const publication = this.room?.localParticipant.getTrackPublication(Track.Source.Camera);
    const mediaTrack = publication?.track?.mediaStreamTrack;
    if (mediaTrack) mediaTrack.enabled = enabled;
    if (publication) {
      if (enabled) await publication.unmute();
      else await publication.mute();
    }
  }

  async startScreenShare() {
    if (!this.room) return false;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    this._screenTrack = track;
    await this.room.localParticipant.publishTrack(track, {
      source: Track.Source.ScreenShare,
      name: 'screen',
    });

    track.onended = () => {
      this.stopScreenShare();
    };
    this._emitState({
      connectionState: this.getConnectionState(),
      remoteParticipants: this.getRemoteParticipants(),
      isScreenSharing: true,
    });
    return true;
  }

  async stopScreenShare() {
    if (!this.room) return;
    const pub = this.room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (pub?.track) {
      await this.room.localParticipant.unpublishTrack(pub.track);
    }
    if (this._screenTrack) {
      this._screenTrack.stop();
      this._screenTrack = null;
    }
    this._emitState({
      connectionState: this.getConnectionState(),
      remoteParticipants: this.getRemoteParticipants(),
      isScreenSharing: false,
    });
  }

  async disconnect() {
    if (this._disconnecting) {
      return;
    }
    this._disconnecting = true;

    try {
      if (this._screenTrack) {
        this._screenTrack.stop();
        this._screenTrack = null;
      }

      if (this.room) {
        const local = this.room.localParticipant;
        const publications = local ? Array.from(local.trackPublications.values()) : [];

        for (const publication of publications) {
          const mediaTrack = publication.track?.mediaStreamTrack;
          if (mediaTrack) {
            mediaTrack.enabled = false;
            try {
              mediaTrack.stop();
            } catch {
              // Track may already be stopped.
            }
          }
          if (publication.track) {
            try {
              await local.unpublishTrack(publication.track);
            } catch {
              // Unpublish may fail if the room is already disconnecting.
            }
          }
        }

        try {
          await this.room.disconnect();
        } catch {
          // Disconnect is best-effort during teardown.
        }
        this.room = null;
      }
      this._remoteAudio.cleanup();
    } finally {
      this._stateListeners.clear();
      this._chatListeners.clear();
      this._reactionListeners.clear();
      this._handStateListeners.clear();
      this._captionListeners.clear();
    }
  }
}

export { ConnectionState, Track, RoomEvent };
