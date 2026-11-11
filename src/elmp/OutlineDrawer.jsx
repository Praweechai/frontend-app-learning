import { useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { LinkContext, OutlinePanel, OutlineRail } from '@elmp/classroom-kit';

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

// Course progress for the panel = units done / all units the learner can see (same as the module bars).
export const outlineProgress = (sections) => {
  const items = sections.flatMap((s) => s.items);
  return items.length ? Math.round((items.filter((i) => i.complete).length / items.length) * 100) : 0;
};

// ELMP: CourseOutlineSidebarSlot widget. Same data and behaviour as the upstream tray (loading,
// completion check on click, closes on phones after a click), Classroom look.
// Plan 5 F-136: kit OutlinePanel (Course outline / Resources tabs, search, course progress, modules with %).
// When hidden, a 40 px rail with ☰ brings it back (wide screens, Plan 4 F-116).
export const ElmpOutlineDrawer = () => {
  const {
    courseId, unitId, currentSidebar, handleToggleCollapse, isActiveEntranceExam, shouldDisplayFullScreen,
    sections, sequences, units, handleUnitClick,
  } = useCourseOutlineSidebar();
  const sectionOrder = useSelector((state) => state.models.coursewareMeta?.[courseId]?.sectionIds);
  // Player 4: certificate row at the end of the outline, unlocked by a passing grade → the course-finished page
  const passed = useSelector((state) => Boolean(state.models.coursewareMeta?.[courseId]?.userHasPassingGrade));
  if (isActiveEntranceExam) { return null; }
  if (currentSidebar !== ID) { return shouldDisplayFullScreen ? null : <OutlineRail onOpen={handleToggleCollapse} />; }
  const outline = drawerOutline({
    courseId, unitId, sectionOrder, sections, sequences, units,
  });
  return (
    <LinkContext.Provider value={RouterLink}>
      <OutlinePanel
        id="elmp-outline"
        sections={outline}
        progress={outlineProgress(outline)}
        overlay={shouldDisplayFullScreen}
        certificate={{ href: `/course/${courseId}/course-end`, unlocked: passed }}
        onClose={shouldDisplayFullScreen ? handleToggleCollapse : undefined}
        onNavigate={(item) => {
          handleUnitClick({ sequenceId: item.sequenceId, activeUnitId: unitId, id: item.id });
          if (shouldDisplayFullScreen) { handleToggleCollapse(); }
        }}
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
