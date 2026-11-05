import { useContext } from 'react';
import PropTypes from 'prop-types';
import { Event, Schedule, ViewList } from '@openedx/paragon/icons';
import { getConfig } from '@edx/frontend-platform';
import { sendTrackingLogEvent } from '@edx/frontend-platform/analytics';
import { AppContext } from '@edx/frontend-platform/react';
import {
  CertificatePreview, CourseHero, formatDate, getPortalClient, localized, messages, useClassroomIntl, usePortal,
} from '@elmp/classroom-kit';

import { useModel } from '../generic/model-store';
import { dashboardLinks } from './LearningHeader';

// Course blocks + CA-04 → CourseHero props (S-75). Counts are subsections (what the course home lists).
export const heroData = ({
  sectionIds = [], sections = {}, sequences = {}, resumeCourse = {}, context,
}) => {
  const seqs = sectionIds
    .filter((id) => sections[id] && !sections[id].hideFromTOC)
    .flatMap((id) => sections[id].sequenceIds)
    .map((id) => sequences[id])
    .filter((seq) => seq && !seq.hideFromTOC);
  const total = seqs.length;
  const done = seqs.filter((seq) => seq.complete).length;
  const minutes = Math.round(seqs.reduce((sum, seq) => sum + (seq.effortTime || 0), 0) / 60);
  let action = resumeCourse.hasVisitedCourse ? 'resume' : 'start';
  if (total > 0 && done === total) { action = 'review'; }
  const required = (context?.required_by || []).filter((item) => item.status !== 'completed');
  return {
    total,
    done,
    minutes,
    ceHours: context?.ce_hours,
    nextDue: required[0],
    progress: {
      percent: total ? Math.round((done * 100) / total) : 0,
      done,
      total,
      href: resumeCourse.url || undefined,
      action,
    },
    requiredBy: context?.required_by || [],
  };
};

// Earned course certificate → its page on the LMS (same rule as the upstream certificate alert).
export const certificateHref = (certData, lmsBase = getConfig().LMS_BASE_URL) => (
  certData?.certWebViewUrl ? `${lmsBase}${certData.certWebViewUrl}` : undefined
);

// ELMP: top of the course home (doc 04 §6.5). Rendered by OutlineTab in place of its title and
// Start/Resume card (ELMP-CHANGES.md).
const CourseHomeHero = ({ courseId }) => {
  const intl = useClassroomIntl();
  const { locale } = intl;
  const { title, number, org } = useModel('courseHomeMeta', courseId) || {};
  const outline = useModel('outline', courseId) || {};
  const {
    courseBlocks: { courses = {}, sections = {}, sequences = {} } = {}, resumeCourse = {}, certData,
  } = outline;
  const { authenticatedUser } = useContext(AppContext);
  const me = usePortal((opts) => getPortalClient().me(opts));
  const learnerName = me.data?.data
    ? localized(me.data.data.name, locale)
    : (authenticatedUser?.name || authenticatedUser?.username);
  const rootId = Object.keys(courses)[0];
  const ctx = usePortal((opts) => getPortalClient().courseContext(courseId, opts), [courseId]);
  const data = heroData({
    sectionIds: courses[rootId]?.sectionIds, sections, sequences, resumeCourse, context: ctx.data?.data,
  });

  const facts = [];
  if (data.minutes > 0) {
    const hours = Math.round(data.minutes / 6) / 10;
    facts.push({
      icon: Schedule,
      value: data.minutes < 60 ? intl.formatMessage(messages.minutes, { n: data.minutes })
        : intl.formatMessage(messages.duration, { hours }),
      label: intl.formatMessage(messages.factDuration),
    });
  }
  if (data.total > 0) {
    facts.push({ icon: ViewList, value: String(data.total), label: intl.formatMessage(messages.factUnits) });
  }
  if (data.ceHours > 0) {
    facts.push({ icon: Event, value: String(data.ceHours), label: intl.formatMessage(messages.factHours) });
  }
  if (data.nextDue) {
    facts.push({
      icon: Event,
      value: formatDate(data.nextDue.due_at, locale),
      label: intl.formatMessage(messages.factDue),
      overdue: data.nextDue.status === 'overdue',
    });
  }

  const { progress } = data;
  return (
    <div
      onClickCapture={(event) => {
        if (progress.href && event.target.closest?.('.cls-hero__progress a')) {
          sendTrackingLogEvent('edx.course.home.resume_course.clicked', {
            org_key: org, courserun_key: courseId, event_type: progress.action, url: progress.href,
          });
        }
      }}
    >
      <CourseHero
        title={title || ''}
        code={number || undefined}
        backHref={dashboardLinks().home}
        facts={facts}
        requiredBy={data.requiredBy}
        progress={progress}
        aside={(
          <CertificatePreview
            courseTitle={title || ''}
            learnerName={learnerName || undefined}
            href={certificateHref(certData)}
          />
        )}
      />
    </div>
  );
};

CourseHomeHero.propTypes = { courseId: PropTypes.string.isRequired };

export default CourseHomeHero;
