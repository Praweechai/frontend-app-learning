// ELMP Plan 5 · V-4.03 (Player 4): end of every lesson page — "Page complete" or what is still open on the page
// (ELMP lesson blocks, told by the lesson frame through bridge v2) + a big Next card and the previous page.
// SequenceContainerSlot widget: it sits right under the lesson, no upstream file changed.
import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { getConfig } from '@edx/frontend-platform';
import { EndCard, LinkContext, flattenOutline } from '@elmp/classroom-kit';

import { getCourseOutline } from '../courseware/data/selectors';
import { RouterLink } from './CourseHomeOutline';
import { drawerOutline } from './OutlineDrawer';
import { originOf } from './PlayerActivity';
import useLessonBridge from './lessonBridge';

export const neighbours = (units, unitId) => {
  const at = units.findIndex((u) => u.id === unitId);
  if (at < 0) { return { current: null, prev: null, next: null }; }
  return { current: units[at], prev: units[at - 1] || null, next: units[at + 1] || null };
};

const LessonEnd = ({ courseId, unitId }) => {
  const sectionOrder = useSelector((state) => state.models.coursewareMeta?.[courseId]?.sectionIds);
  const outlineData = useSelector(getCourseOutline);
  const { left } = useLessonBridge(originOf(getConfig().LMS_BASE_URL), unitId);
  const units = useMemo(() => flattenOutline(drawerOutline({
    courseId, unitId, sectionOrder, ...(outlineData || {}),
  })), [courseId, unitId, sectionOrder, outlineData]);
  const { current, prev, next } = neighbours(units, unitId);
  if (!unitId || !current) { return null; }
  return (
    <LinkContext.Provider value={RouterLink}>
      <div className="elmp-end">
        <EndCard left={left === undefined ? null : left} complete={current.complete} prev={prev} next={next} />
      </div>
    </LinkContext.Provider>
  );
};

LessonEnd.propTypes = { courseId: PropTypes.string.isRequired, unitId: PropTypes.string };

export default LessonEnd;
