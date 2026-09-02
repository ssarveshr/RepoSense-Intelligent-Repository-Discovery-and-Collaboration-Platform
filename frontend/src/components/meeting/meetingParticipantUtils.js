import { Track, normalizeActiveSpeakerIdentities } from '../../services/livekitClient';

export { normalizeActiveSpeakerIdentities };

export function isActiveSpeaker(activeSpeakers, identity) {
  if (!identity) return false;
  return normalizeActiveSpeakerIdentities(activeSpeakers).includes(identity);
}

export function countLiveParticipants(remoteTileCount) {
  return Math.max(1, 1 + remoteTileCount);
}

/** Authoritative active in-call count: local participant + unique remote participants. */
export function getActiveParticipantCount(room) {
  if (!room?.localParticipant) {
    return 1;
  }
  return 1 + listRemoteParticipants(room).length;
}

function mediaStreamFromPublication(publication) {
  const mediaTrack = publication?.track?.mediaStreamTrack;
  if (!mediaTrack) return null;
  try {
    return new MediaStream([mediaTrack]);
  } catch {
    return null;
  }
}

export function participantStream(participant, source) {
  if (!participant || typeof participant.getTrackPublication !== 'function') {
    return null;
  }
  try {
    const publication = participant.getTrackPublication(source);
    return mediaStreamFromPublication(publication);
  } catch {
    return null;
  }
}

export function isParticipantMuted(participant) {
  if (!participant || typeof participant.getTrackPublication !== 'function') {
    return true;
  }
  try {
    const publication = participant.getTrackPublication(Track.Source.Microphone);
    if (!publication) return true;
    return publication.isMuted;
  } catch {
    return true;
  }
}

export function listRemoteParticipants(room) {
  if (!room?.remoteParticipants) return [];
  if (typeof room.remoteParticipants.values === 'function') {
    return Array.from(room.remoteParticipants.values()).filter(Boolean);
  }
  if (typeof room.remoteParticipants.forEach === 'function') {
    const participants = [];
    room.remoteParticipants.forEach((participant) => {
      if (participant) participants.push(participant);
    });
    return participants;
  }
  return [];
}

export function buildRemoteParticipantTiles(room, speakers = []) {
  const speakerIds = normalizeActiveSpeakerIdentities(speakers);
  const tiles = [];

  for (const participant of listRemoteParticipants(room)) {
    try {
      const identity = participant.identity || participant.sid;
      if (!identity) continue;

      const screenStream = participantStream(participant, Track.Source.ScreenShare);
      const cameraStream = participantStream(participant, Track.Source.Camera);

      tiles.push({
        id: String(identity),
        label: participant.name || participant.identity || 'Guest',
        stream: screenStream || cameraStream,
        cameraStream,
        screenStream,
        isScreenShare: Boolean(screenStream),
        muted: isParticipantMuted(participant),
        isActiveSpeaker: speakerIds.includes(participant.identity),
        isLocal: false,
      });
    } catch (error) {
      console.error('[RepoSense Meet] Failed to build remote participant tile:', error);
    }
  }

  return tiles;
}
