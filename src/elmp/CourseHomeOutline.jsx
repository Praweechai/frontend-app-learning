import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  CourseOutline, LinkContext, messages as kitMessages, useClassroomIntl,
} from '@elmp/classroom-kit';

import { useModel } from '../generic/model-store';
import { useContextId } from '../data/hooks';

// The kit's links take `href`; inside the app we route without a page reload.
export const RouterLink = forwardRef(({ href, ...rest }, ref) => <Link ref={ref} to={href} {...rest} />);
RouterLink.displayName = 'RouterLink';
RouterLink.propTypes = { href: PropTypes.string.isRequired };

// Course blocks → kit outline. Hidden blocks are left out. "Current" = first unfinished subsection in the
// section Open edX marks as the resume point (the upstream outline opens that section too).
export const outlineSections = ({
  courseId, sectionIds = [], sections = {}, sequences = {},
}) => {
  const visible = sectionIds.map((id) => sections[id]).filter((s) => s && !s.hideFromTOC);
  const resume = visible.find((s) => s.resumeBlock);
  const currentId = resume?.sequenceIds.find((id) => sequences[id] && !sequences[id].complete);
  return visible.map((section) => ({
    id: section.id,
    title: section.title,
    items: section.sequenceIds
      .map((id) => sequences[id])
      .filter((seq) => seq && !seq.hideFromTOC)
      .map((seq) => ({
        id: seq.id,
        title: seq.title,
        href: seq.showLink ? `/course/${courseId}/${seq.id}` : undefined,
        complete: Boolean(seq.complete),
        current: seq.id === currentId,
        locked: !seq.showLink,
        minutes: seq.effortTime ? Math.ceil(seq.effortTime / 60) : undefined,
      })),
  }));
};

// ELMP: CourseHomeSectionOutlineSlot widget (S-75, doc 04 §5.11).
const CourseHomeOutline = ({ sectionIds, sections }) => {
  const intl = useClassroomIntl();
  const courseId = useContextId();
  const { courseBlocks: { sequences = {} } = {} } = useModel('outline', courseId) || {};
  return (
    <LinkContext.Provider value={RouterLink}>
      <CourseOutline
        title={intl.formatMessage(kitMessages.outlineTitle)}
        sections={outlineSections({
          courseId, sectionIds, sections, sequences,
        })}
      />
    </LinkContext.Provider>
  );
};

CourseHomeOutline.propTypes = {
  sectionIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  sections: PropTypes.shape({}).isRequired,
};

export default CourseHomeOutline;
