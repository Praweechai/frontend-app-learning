// ELMP Plan 4 · F-117: inactivity timer + time on task inside the player (doc 02 §7).
// Lesson pages (LMS iframe) report activity through the bridge script; this listens, shows
// "Are you still there?", pauses videos when nobody answers, and sends active seconds to the Portal (CA-12).
// Plan 5 · V-4.03 (Player 4): "This session" clock + focus block → break. During a break the idle timer is off,
// nothing is counted, and lesson videos are paused.
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import { getConfig } from '@edx/frontend-platform';
import {
  FocusBreakDialog, IdleDialog, getPortalClient, useActivitySender, useIdleTimer, usePortal, useSession,
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

export function usePlayerActivity(courseId) {
  const me = usePortal((opts) => getPortalClient().me(opts));
  const inactivity = me.data?.data?.features?.inactivity;
  // Portal down: still count nothing and warn nobody — safer than guessing settings (NFR-C8).
  const enabled = me.status === 'ready' && inactivity?.enabled !== false;
  const lmsOrigin = originOf(getConfig().LMS_BASE_URL);
  const origins = useMemo(() => (lmsOrigin ? [lmsOrigin] : []), [lmsOrigin]);
  const onPause = useCallback(() => pauseLessons(lmsOrigin), [lmsOrigin]);
  // the break and the idle timer must not fight: no idle warning during a break, no clock while idle
  const [onBreak, setOnBreak] = useState(false);
  const idle = useIdleTimer({
    idleSeconds: inactivity?.idle_seconds || 300,
    warnSeconds: 60,
    enabled: enabled && !onBreak,
    bridgeOrigins: origins,
    onPause,
  });
  const session = useSession({ running: idle.state === 'active' });
  useEffect(() => {
    setOnBreak(session.phase === 'break');
    if (session.phase === 'break') { onPause(); }
  }, [session.phase, onPause]);
  useActivitySender({
    client: getPortalClient(),
    courseKey: courseId,
    takeSeconds: idle.takeSeconds,
    giveBack: idle.giveBack,
    enabled,
  });
  return { idle, session };
}

const PlayerActivity = ({ activity }) => (
  <>
    <IdleDialog state={activity.idle.state} secondsLeft={activity.idle.secondsLeft} onResume={activity.idle.resume} />
    {activity.idle.state === 'active' && <FocusBreakDialog session={activity.session} />}
  </>
);

PlayerActivity.propTypes = {
  activity: PropTypes.shape({
    idle: PropTypes.shape({
      state: PropTypes.string, secondsLeft: PropTypes.number, resume: PropTypes.func,
    }).isRequired,
    session: PropTypes.shape({ phase: PropTypes.string }).isRequired,
  }).isRequired,
};

export default PlayerActivity;
