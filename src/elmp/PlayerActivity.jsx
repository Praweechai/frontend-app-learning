// ELMP Plan 4 · F-117: inactivity timer + time on task inside the player (doc 02 §7).
// Lesson pages (LMS iframe) report activity through the bridge script; this listens, shows
// "Are you still there?", pauses videos when nobody answers, and sends active seconds to the Portal (CA-12).
import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform';
import {
  IdleDialog, getPortalClient, useActivitySender, useIdleTimer, usePortal,
} from '@elmp/classroom-kit';

export const originOf = (url) => {
  try { return new URL(url).origin; } catch (e) { return null; }
};

// Every iframe in the player gets the pause request; the bridge only obeys messages from the Classroom.
export const pauseLessons = (lmsOrigin) => {
  if (!lmsOrigin) { return; }
  document.querySelectorAll('iframe').forEach((frame) => {
    try { frame.contentWindow?.postMessage({ type: 'elmp.pause' }, lmsOrigin); } catch (e) { /* frame gone */ }
  });
};

const PlayerActivity = ({ courseId }) => {
  const me = usePortal((opts) => getPortalClient().me(opts));
  const inactivity = me.data?.data?.features?.inactivity;
  // Portal down: still count nothing and warn nobody — safer than guessing settings (NFR-C8).
  const enabled = me.status === 'ready' && inactivity?.enabled !== false;
  const lmsOrigin = originOf(getConfig().LMS_BASE_URL);
  const origins = useMemo(() => (lmsOrigin ? [lmsOrigin] : []), [lmsOrigin]);
  const onPause = useCallback(() => pauseLessons(lmsOrigin), [lmsOrigin]);
  const idle = useIdleTimer({
    idleSeconds: inactivity?.idle_seconds || 300,
    warnSeconds: 60,
    enabled,
    bridgeOrigins: origins,
    onPause,
  });
  useActivitySender({
    client: getPortalClient(),
    courseKey: courseId,
    takeSeconds: idle.takeSeconds,
    giveBack: idle.giveBack,
    enabled,
  });
  return <IdleDialog state={idle.state} secondsLeft={idle.secondsLeft} onResume={idle.resume} />;
};

PlayerActivity.propTypes = { courseId: PropTypes.string.isRequired };

export default PlayerActivity;
