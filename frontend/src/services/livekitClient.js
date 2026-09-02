import { Room, RoomEvent, Track, ConnectionState } from 'livekit-client';

const CHAT_TOPIC = 'reposense-chat';

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
    this._screenTrack = null;
    this._disconnecting = false;
  }

  onStateChange(listener) {
    this._stateListeners.add(listener);
    return () => this._stateListeners.delete(listener);
  }

  onChatMessage(listener) {
    this._chatListeners.add(listener);
    return () => this._chatListeners.delete(listener);
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
    this.room.on(RoomEvent.ParticipantDisconnected, notify);
    this.room.on(RoomEvent.TrackSubscribed, notify);
    this.room.on(RoomEvent.TrackUnsubscribed, notify);
    this.room.on(RoomEvent.Disconnected, notify);
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      this._lastActiveSpeakers = speakers.map((s) => s.identity);
      notify(this._lastActiveSpeakers);
    });
    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const parsed = JSON.parse(decoded);
        if (parsed.type === 'chat') {
          this._emitChat({
            id: `${participant?.identity || 'local'}-${Date.now()}`,
            sender: parsed.sender || participant?.name || 'Guest',
            text: parsed.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLocal: participant?.identity === this.room?.localParticipant?.identity,
          });
        }
      } catch {
        // ignore malformed payloads
      }
    });

    await this.room.connect(livekitUrl, token);

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
    } finally {
      this._stateListeners.clear();
      this._chatListeners.clear();
    }
  }
}

export { ConnectionState, Track, RoomEvent };
