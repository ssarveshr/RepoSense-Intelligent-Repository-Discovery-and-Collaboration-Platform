import MeetingParticipantTile from './MeetingParticipantTile';
import { getParticipantGridClass } from './meetingLayoutUtils';

function tileForGrid(tile) {
  return {
    ...tile,
    stream: tile.screenStream || tile.cameraStream || tile.stream,
    isScreenShare: Boolean(tile.screenStream),
  };
}

function thumbnailForPresentation(tile, presenterId) {
  if (tile.id === presenterId) {
    return {
      ...tile,
      stream: tile.cameraStream || null,
      isScreenShare: false,
      mirror: tile.isLocal,
    };
  }
  return tileForGrid(tile);
}

export default function ParticipantGrid({
  localTile,
  remoteTiles,
  chatOpen,
  isMobile,
  handStates = {},
}) {
  const allTiles = [localTile, ...remoteTiles];
  const count = allTiles.length;
  const solo = count === 1;
  const gridClass = getParticipantGridClass(count, { chatOpen, compact: isMobile });

  const presenterTile = allTiles.find((t) => t.screenStream);
  const isPresentationMode = Boolean(presenterTile);

  if (isPresentationMode) {
    const presenterDisplay = {
      ...presenterTile,
      stream: presenterTile.screenStream,
      isScreenShare: true,
      isPresenter: true,
      mirror: false,
    };

    const thumbnails = allTiles.map((tile) =>
      thumbnailForPresentation(tileForGrid(tile), presenterTile.id),
    );

    return (
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full min-h-0 w-full overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <MeetingParticipantTile
            {...presenterDisplay}
            handRaised={handStates[presenterTile.id]?.raised}
          />
          <p className="text-center text-[#737373] text-xs mt-2 shrink-0">
            {presenterTile.label} is presenting
          </p>
        </div>

        {thumbnails.length > 0 && (
          <div className="lg:w-52 xl:w-60 shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-full pb-1 lg:pb-0">
            {thumbnails.map((tile, index) => (
              <MeetingParticipantTile
                key={tile.id || `participant-${index}`}
                {...tile}
                compact
                handRaised={handStates[tile.id]?.raised}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={gridClass} data-participant-count={count} data-testid="participant-grid">
      {allTiles.map((tile, index) => {
        const display = tileForGrid(tile);
        return (
          <MeetingParticipantTile
            key={tile.id || `participant-${index}`}
            {...display}
            solo={solo}
            mirror={display.isLocal && !display.isScreenShare}
            handRaised={handStates[tile.id]?.raised}
          />
        );
      })}
    </div>
  );
}

export function FloatingReactions({ reactions }) {
  if (!reactions.length) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-wrap justify-center gap-3 px-4 z-20">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111111]/90 border border-[#2F2F2F] shadow-lg transition-opacity duration-300"
        >
          <span className="text-2xl leading-none" role="img" aria-label={`Reaction ${reaction.emoji}`}>
            {reaction.emoji}
          </span>
          <span className="text-white text-xs font-semibold">{reaction.sender}</span>
        </div>
      ))}
    </div>
  );
}
