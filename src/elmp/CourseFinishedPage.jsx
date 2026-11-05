import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { getConfig } from '@edx/frontend-platform';
import {
  CourseFinished, LinkContext, getPortalClient, nextRequiredCourse, usePortal,
} from '@elmp/classroom-kit';

import { useModel } from '../generic/model-store';
import { RouterLink } from './CourseHomeOutline';
import { dashboardLinks } from './LearningHeader';

// Certificate states the upstream screen must keep handling (request button, ID verification).
export const UPSTREAM_STATUSES = ['requesting', 'unverified'];

export const finishedCertificateHref = (certificateData, lmsBase = getConfig().LMS_BASE_URL) => (
  certificateData?.certStatus === 'downloadable' && certificateData.certWebViewUrl
    ? `${lmsBase}${certificateData.certWebViewUrl}` : undefined
);

// CA-05 result → what the screen says about the training record.
export const recordState = (result) => {
  if (result === undefined) { return 'updating'; }
  return result?.data?.refreshed ? 'updated' : 'later';
};

// ELMP: S-77 course finished (doc 04 §6.7). Rendered by CourseExit for the celebration case
// (ELMP-CHANGES.md); `fallback` (the upstream screen) stays for certificate requests.
const CourseFinishedPage = ({ fallback }) => {
  const courseId = useSelector((state) => state.courseware.courseId);
  const { title, certificateData } = useModel('coursewareMeta', courseId) || {};
  const [refresh, setRefresh] = useState(undefined);

  // Tell the Portal now, so My learning and HR reports show the pass at once (F-99).
  useEffect(() => {
    let alive = true;
    getPortalClient().refreshProgress(courseId)
      .then((res) => { if (alive) { setRefresh(res || null); } })
      .catch(() => { if (alive) { setRefresh(null); } });
    return () => { alive = false; };
  }, [courseId]);

  const context = usePortal((opts) => getPortalClient().courseContext(courseId, opts), [courseId]);
  const training = usePortal((opts) => getPortalClient().training(opts), [refresh === undefined]);

  if (UPSTREAM_STATUSES.includes(certificateData?.certStatus)) { return fallback; }

  const course = refresh?.data?.course || {};
  const next = refresh === undefined ? null : nextRequiredCourse(training.data?.data, courseId);
  return (
    <LinkContext.Provider value={RouterLink}>
      <CourseFinished
        courseTitle={title || ''}
        grade={course.grade_percent ?? undefined}
        ceHours={context.data?.data?.ce_hours}
        finishedAt={course.passed_at || undefined}
        certificateHref={finishedCertificateHref(certificateData)}
        upNext={next ? { ...next, href: `/course/${next.course.course_key}/home` } : undefined}
        backHref={dashboardLinks().home}
        record={recordState(refresh)}
      />
    </LinkContext.Provider>
  );
};

CourseFinishedPage.propTypes = { fallback: PropTypes.node };

export default CourseFinishedPage;
