import { Track } from 'livekit-client';

/**
 * Attach/detach remote audio tracks so subscribed microphone audio is audible.
 * Video tiles only render camera tracks; audio is handled here.
 */
export class RemoteAudioPlayback {
  constructor() {
    this._attachedTrackSids = new Set();
  }

  attachTrack(track) {
    if (!track || track.kind !== Track.Kind.Audio) return;
    const sid = track.mediaStreamTrack?.id || track.sid;
    if (sid && this._attachedTrackSids.has(sid)) return;

    try {
      const elements = track.attach();
      elements.forEach((element) => {
        element.style.display = 'none';
        element.dataset.livekitRemoteAudio = 'true';
        if (!element.isConnected) {
          document.body.appendChild(element);
        }
      });
      if (sid) this._attachedTrackSids.add(sid);
    } catch (error) {
      console.error('[RepoSense Meet] Failed to attach remote audio track:', error);
    }
  }

  detachTrack(track) {
    if (!track) return;
    try {
      const elements = track.detach();
      elements.forEach((element) => element.remove());
      const sid = track.mediaStreamTrack?.id || track.sid;
      if (sid) this._attachedTrackSids.delete(sid);
    } catch (error) {
      console.error('[RepoSense Meet] Failed to detach remote audio track:', error);
    }
  }

  attachRoomRemoteAudio(room) {
    if (!room) return;
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.kind === Track.Kind.Audio && publication.track) {
          this.attachTrack(publication.track);
        }
      });
    });
  }

  cleanup() {
    document.querySelectorAll('[data-livekit-remote-audio="true"]').forEach((element) => {
      element.remove();
    });
    this._attachedTrackSids.clear();
  }
}
