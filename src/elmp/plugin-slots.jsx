import { DIRECT_PLUGIN, PLUGIN_OPERATIONS } from '@openedx/frontend-plugin-framework';

import CourseHomeOutline from './CourseHomeOutline';
import LearningHeader from './LearningHeader';
import LessonEnd from './LessonEnd';
import { ElmpOutlineDrawer, OutlineBridge } from './OutlineDrawer';
import UnitHeading from './UnitHeading';
import './course-home.css';
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
  // Player outline drawer; its button is in the top bar, so the old triggers become a bridge / nothing (S-76).
  'org.openedx.frontend.learning.course_outline_sidebar.v1': replaceWith('elmp_outline_drawer', ElmpOutlineDrawer),
  'org.openedx.frontend.learning.course_outline_sidebar_trigger.v1': replaceWith('elmp_outline_bridge', OutlineBridge),
  'org.openedx.frontend.learning.course_outline_mobile_sidebar_trigger.v1': { keepDefault: false, plugins: [] },
  // S-77 has its own "Back to My learning"; the upstream "View courses" button goes to the old dashboard.
  'org.openedx.frontend.learning.course_exit_view_courses.v1': { keepDefault: false, plugins: [] },
  // Player 4 (V-4.03): end-of-page card right under the lesson (what is left + Next), fed by bridge v2.
  'org.openedx.frontend.learning.sequence_container.v1': {
    keepDefault: true,
    plugins: [{
      op: PLUGIN_OPERATIONS.Insert,
      widget: {
        id: 'elmp_lesson_end', priority: 10, type: DIRECT_PLUGIN, RenderWidget: LessonEnd,
      },
    }],
  },
};

export default elmpPluginSlots;
