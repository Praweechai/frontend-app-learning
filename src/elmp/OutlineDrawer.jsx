import { useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { LinkContext, OutlineDrawer } from '@elmp/classroom-kit';

import SidebarContext from '../courseware/course/sidebar/SidebarContext';
import { ID } from '../courseware/course/sidebar/sidebars/course-outline/constants';
import { useCourseOutlineSidebar } from '../courseware/course/sidebar/sidebars/course-outline/hooks';
import { RouterLink } from './CourseHomeOutline';
import { TOGGLE_EVENT, announceOutlineState } from './outlineEvents';

// Courseware outline → kit drawer: one group per subsection, its units as rows (S-76).
export const drawerOutline = ({
  courseId, unitId, sectionOrder, sections = {}, sequences = {}, units = {},
}) => {
  const order = sectionOrder?.length ? sectionOrder : Object.keys(sections);
  return order
    .flatMap((id) => sections[id]?.sequenceIds || [])
    .map((id) => sequences[id])
    .filter((seq) => seq && seq.unitIds?.length)
    .map((seq) => ({
      id: seq.id,
      title: seq.title,
      items: seq.unitIds.filter((id) => units[id]).map((id) => ({
        id,
        sequenceId: seq.id,
        title: units[id].title,
        href: `/course/${courseId}/${seq.id}/${id}`,
        complete: Boolean(units[id].complete),
        current: id === unitId,
        locked: seq.type === 'lock',
      })),
    }));
};

// ELMP: CourseOutlineSidebarSlot widget. Same data and behaviour as the upstream tray (loading,
// completion check on click, closes on phones after a click), Classroom look.
export const ElmpOutlineDrawer = () => {
  const {
    courseId, unitId, currentSidebar, handleToggleCollapse, isActiveEntranceExam, shouldDisplayFullScreen,
    sections, sequences, units, handleUnitClick,
  } = useCourseOutlineSidebar();
  const sectionOrder = useSelector((state) => state.models.coursewareMeta?.[courseId]?.sectionIds);
  if (isActiveEntranceExam || currentSidebar !== ID) { return null; }
  return (
    <LinkContext.Provider value={RouterLink}>
      <OutlineDrawer
        sections={drawerOutline({
          courseId, unitId, sectionOrder, sections, sequences, units,
        })}
        overlay={shouldDisplayFullScreen}
        onClose={handleToggleCollapse}
        onNavigate={(item) => handleUnitClick({ sequenceId: item.sequenceId, activeUnitId: unitId, id: item.id })}
      />
    </LinkContext.Provider>
  );
};

// ELMP: CourseOutlineSidebarTriggerSlot widget. No button of its own (the top bar has it); it listens
// for the top bar's toggle and reports open/closed back.
export const OutlineBridge = () => {
  const { currentSidebar, toggleSidebar } = useContext(SidebarContext);
  const open = currentSidebar === ID;
  useEffect(() => {
    const onToggle = () => toggleSidebar(ID);
    window.addEventListener(TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(TOGGLE_EVENT, onToggle);
  }, [toggleSidebar]);
  useEffect(() => { announceOutlineState({ open, available: true }); }, [open]);
  useEffect(() => () => announceOutlineState({ open: false, available: false }), []);
  return null;
};
