import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';

import CourseHomeOutline from './CourseHomeOutline';
import LearningHeader from './LearningHeader';
import UnitHeading from './UnitHeading';
import './player.css';

const replaceWith = (id, RenderWidget) => ({
  keepDefault: false,
  plugins: [{
    op: PLUGIN_OPERATIONS.Insert,
    widget: {
      id, priority: 50, type: DIRECT_PLUGIN, RenderWidget,
    },
  }],
});

// ELMP Classroom slots in the learning app (Plan 3 · P3-5, R-12 §4). Slots first; upstream files only
// when no slot can do the job (ELMP-CHANGES.md).
const elmpPluginSlots = {
  // Classroom header on course pages, player top bar inside units (S-75, S-76).
  'org.openedx.frontend.layout.header_learning.v1': replaceWith('elmp_learning_header', LearningHeader),
  // No Open edX footer anywhere in the Classroom (doc 04 §3).
  'org.openedx.frontend.layout.footer.v1': { keepDefault: false, plugins: [] },
  // Unit title as H1 with the subsection name; no top Previous/Next (S-76).
  'org.openedx.frontend.learning.unit_title.v1': replaceWith('elmp_unit_title', UnitHeading),
  // Course outline on the course home: Classroom sections, done counts, "you are here" (S-75).
  'org.openedx.frontend.learning.course_home_section_outline.v1': replaceWith('elmp_course_outline', CourseHomeOutline),
};

export default elmpPluginSlots;
