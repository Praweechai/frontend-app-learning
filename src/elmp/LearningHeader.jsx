import { useContext, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { shallowEqual, useSelector } from 'react-redux';
import { matchPath, useLocation } from 'react-router-dom';
import { getConfig } from '@edx/frontend-platform';
import { useIntl } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import {
  ClassroomHeader, LinkContext, PlayerTopBar3, ReadingLine, displayAttributes, flattenOutline, getPortalClient, localized,
  messages as kitMessages, useClassroomIntl, useDisplaySettings, useFullscreen, useLessonDisplay, usePortal,
} from '@elmp/classroom-kit';

import { getCourseOutline } from '../courseware/data/selectors';
import { RouterLink } from './CourseHomeOutline';
import setClassroomLanguage from './language';
import { drawerOutline } from './OutlineDrawer';
import { requestOutlineToggle, useOutlineState } from './outlineEvents';
import PlayerActivity, { originOf, usePlayerActivity } from './PlayerActivity';
import { playerPosition } from './playerPosition';
import { runShortcut, usePlayerShortcuts } from './playerKeys';
import SideArrows from './SideArrows';

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
    courses: `${base}/courses`,
    grades: `${base}/grades`,
    progress: `${base}/progress`,
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
  const links = {
    ...dashboardLinks(config),
    hours: data?.features?.ce_hours ? dashboardLinks(config).hours : undefined, // Plan 4 F-112
    portal: data?.has_portal_work ? config.ELMP_PORTAL_HOME_URL : undefined,
  };
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

// Plan 5 (F-136, D-81): display settings live on <body class="cls3-player-page"> while the player is open,
// and go to the lesson iframe (#unit-iframe) through the activity script (P5-3.02).
export const usePageDisplay = (settings) => {
  useEffect(() => {
    const { body } = document;
    const { style, ...attrs } = displayAttributes(settings);
    body.classList.add('cls3-player-page', 'cls-root');
    Object.entries(attrs).forEach(([k, v]) => (v ? body.setAttribute(k, v) : body.removeAttribute(k)));
    Object.entries(style).forEach(([k, v]) => body.style.setProperty(k, String(v)));
    return () => {
      body.classList.remove('cls3-player-page', 'cls-root');
      Object.keys(attrs).forEach((k) => body.removeAttribute(k));
      Object.keys(style).forEach((k) => body.style.removeProperty(k));
    };
  }, [settings]);
};

const lessonFrame = { get current() { return document.getElementById('unit-iframe'); } };

const PlayerHeader = ({
  courseId, sequenceId, unitId, courseTitle,
}) => {
  const { locale } = useIntl();
  const config = getConfig();
  const { authenticatedUser } = useContext(AppContext);
  const position = useSelector((state) => playerPosition(state, sequenceId, unitId), shallowEqual);
  const title = useSelector((state) => courseTitle || state.models.coursewareMeta?.[courseId]?.title || '');
  const sectionOrder = useSelector((state) => state.models.coursewareMeta?.[courseId]?.sectionIds);
  const outlineData = useSelector(getCourseOutline);
  const outline = useOutlineState();
  const unitTitle = useSelector((state) => state.models.units?.[unitId]?.title || '');
  const kitIntl = useClassroomIntl();
  const display = useDisplaySettings();
  const full = useFullscreen(() => document.documentElement);
  const activity = usePlayerActivity(courseId);
  usePlayerShortcuts();
  usePageDisplay(display.settings);
  useLessonDisplay(lessonFrame, display.settings, originOf(config.LMS_BASE_URL));

  const units = useMemo(() => flattenOutline(drawerOutline({
    courseId, unitId, sectionOrder, ...(outlineData || {}),
  })), [courseId, unitId, sectionOrder, outlineData]);

  // F-94 AC-2: "Unit 3 of 8, Hand hygiene" is read out when the unit changes.
  const announcement = [
    position.unitIndex && position.unitCount
      ? kitIntl.formatMessage(kitMessages.unitOf, { i: position.unitIndex, n: position.unitCount }) : '',
    unitTitle,
  ].filter(Boolean).join(', ');
  return (
    <LinkContext.Provider value={RouterLink}>
      <PlayerTopBar3
        courseTitle={title}
        backHref={dashboardLinks(config).home}
        logoUrl={config.LOGO_URL || undefined}
        outlineOpen={outline.open}
        outlineId="elmp-outline"
        onToggleOutline={outline.available ? requestOutlineToggle : undefined}
        display={display}
        units={units}
        locale={locale}
        onLocaleChange={(code) => setClassroomLanguage(code, authenticatedUser?.username)}
        fullscreen={full.on}
        onToggleFullscreen={full.toggle}
        session={activity.session}
        sessionPaused={activity.idle.state !== 'active'}
      />
      <div className="elmp-read"><ReadingLine /></div>
      <SideArrows onPrev={() => runShortcut('prev')} onNext={() => runShortcut('next')} />
      <p className="cls-sr" role="status">{announcement}</p>
      <PlayerActivity activity={activity} />
    </LinkContext.Provider>
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
