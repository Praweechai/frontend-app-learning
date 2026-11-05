import { useContext } from 'react';
import PropTypes from 'prop-types';
import { shallowEqual, useSelector } from 'react-redux';
import { matchPath, useLocation } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import {
  ClassroomHeader, PlayerTopBar, getPortalClient, localized, usePortal,
} from '@elmp/classroom-kit';

import { playerPosition } from './playerPosition';

// Course pages get the Classroom header (S-75); the player gets its own top bar (S-76).
const PAGE_ROUTES = [
  '/course/:courseId/home', '/course/:courseId/dates', '/course/:courseId/progress', '/course/:courseId/progress/*',
  '/course/:courseId/live', '/course/:courseId/course-end', '/course/:courseId/discussion/*',
];
const PLAYER_ROUTES = [
  '/course/:courseId/:sequenceId/:unitId', '/course/:courseId/:sequenceId',
  '/preview/course/:courseId/:sequenceId/:unitId', '/preview/course/:courseId/:sequenceId',
];

export const routeKind = (pathname) => {
  if (PAGE_ROUTES.some((p) => matchPath(p, pathname))) { return { kind: 'page' }; }
  const hit = PLAYER_ROUTES.map((p) => matchPath(p, pathname)).find(Boolean);
  return hit ? { kind: 'player', ...hit.params } : { kind: 'page' };
};

// The Classroom home (learner dashboard) is on the same apps host (doc 03 §2).
export const dashboardLinks = (config = getConfig()) => {
  const base = (config.ELMP_CLASSROOM_HOME_URL || '/learner-dashboard/').replace(/\/$/, '');
  return {
    home: `${base}/`,
    certificates: `${base}/certificates`,
    hours: `${base}/hours`,
    account: config.ELMP_ACCOUNT_URL || undefined,
    signOut: config.LOGOUT_URL || `${config.LMS_BASE_URL}/logout`,
  };
};

export const courseHomeHref = (courseId, config = getConfig()) => (
  `${config.PUBLIC_PATH || '/learning/'}/course/${courseId}/home`.replace(/\/{2,}/g, '/')
);

const CourseHeader = () => {
  const { locale } = useIntl();
  const config = getConfig();
  const { authenticatedUser } = useContext(AppContext);
  const me = usePortal((opts) => getPortalClient().me(opts));
  const data = me.data?.data;
  const links = { ...dashboardLinks(config), portal: data?.has_portal_work ? config.ELMP_PORTAL_HOME_URL : undefined };
  const name = data ? localized(data.name, locale) : (authenticatedUser?.name || authenticatedUser?.username || '');
  const user = name ? {
    name,
    position: data ? localized(data.position, locale) : undefined,
    department: data ? localized(data.department, locale) : undefined,
    photoUrl: data?.photo_url || undefined,
  } : undefined;
  return (
    <ClassroomHeader
      current="home"
      links={links}
      user={user}
      unread={data?.unread_notifications || 0}
      locale={locale}
      onOpenMessages={() => window.location.assign(`${links.home}?messages=1`)}
      logoUrl={config.LOGO_URL}
    />
  );
};

const PlayerHeader = ({
  courseId, sequenceId, unitId, courseTitle,
}) => {
  const position = useSelector((state) => playerPosition(state, sequenceId, unitId), shallowEqual);
  const title = useSelector((state) => courseTitle || state.models.coursewareMeta?.[courseId]?.title || '');
  return (
    <PlayerTopBar
      courseTitle={title}
      courseHref={courseHomeHref(courseId)}
      unitIndex={position.unitIndex}
      unitCount={position.unitCount}
      progress={position.progress}
    />
  );
};

PlayerHeader.propTypes = {
  courseId: PropTypes.string.isRequired,
  sequenceId: PropTypes.string,
  unitId: PropTypes.string,
  courseTitle: PropTypes.string,
};

// ELMP: HeaderSlot widget (doc 04 §5.1, §5.12). No "Open edX" anywhere.
const LearningHeader = ({ courseTitle }) => {
  const { pathname } = useLocation();
  const route = routeKind(pathname);
  if (route.kind === 'player' && route.courseId) {
    return (
      <PlayerHeader
        courseId={decodeURIComponent(route.courseId)}
        sequenceId={route.sequenceId}
        unitId={route.unitId}
        courseTitle={courseTitle}
      />
    );
  }
  return <CourseHeader />;
};

LearningHeader.propTypes = { courseTitle: PropTypes.string };

export default LearningHeader;
