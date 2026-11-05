import { act, render } from '@testing-library/react';

import SidebarContext from '../courseware/course/sidebar/SidebarContext';
import { ID } from '../courseware/course/sidebar/sidebars/course-outline/constants';
import { OutlineBridge, drawerOutline } from './OutlineDrawer';
import { STATE_EVENT, requestOutlineToggle } from './outlineEvents';

jest.mock('../courseware/course/sidebar/sidebars/course-outline/hooks', () => ({ useCourseOutlineSidebar: jest.fn() }));

describe('drawerOutline (S-76)', () => {
  const sections = { c1: { sequenceIds: ['s1', 's2'] }, c2: { sequenceIds: ['s3'] } };
  const sequences = {
    s1: { id: 's1', title: 'Basics', unitIds: ['u1', 'u2'] },
    s2: { id: 's2', title: 'Empty', unitIds: [] },
    s3: {
      id: 's3', title: 'Exam', type: 'lock', unitIds: ['u3'],
    },
  };
  const units = {
    u1: { title: 'Video', complete: true }, u2: { title: 'Reading' }, u3: { title: 'Final quiz' },
  };

  it('lists subsections in course order with their units and marks the current one', () => {
    const out = drawerOutline({
      courseId: 'course-v1:MH+INF101+2026', unitId: 'u2', sectionOrder: ['c2', 'c1'], sections, sequences, units,
    });
    expect(out.map((s) => s.title)).toEqual(['Exam', 'Basics']);
    expect(out[0].items[0]).toMatchObject({ locked: true, sequenceId: 's3' });
    expect(out[1].items).toEqual([
      {
        id: 'u1', sequenceId: 's1', title: 'Video', href: '/course/course-v1:MH+INF101+2026/s1/u1', complete: true, current: false, locked: false,
      },
      {
        id: 'u2', sequenceId: 's1', title: 'Reading', href: '/course/course-v1:MH+INF101+2026/s1/u2', complete: false, current: true, locked: false,
      },
    ]);
  });

  it('falls back to the sections object order and copes with no data', () => {
    expect(drawerOutline({
      courseId: 'x', sections, sequences, units,
    }).map((s) => s.id)).toEqual(['s1', 's3']);
    expect(drawerOutline({ courseId: 'x' })).toEqual([]);
  });
});

describe('OutlineBridge', () => {
  it('toggles the outline sidebar from the top bar and reports its state', () => {
    const toggleSidebar = jest.fn();
    const states = [];
    const onState = (event) => states.push(event.detail);
    window.addEventListener(STATE_EVENT, onState);
    const view = (current) => (
      <SidebarContext.Provider value={{ currentSidebar: current, toggleSidebar }}>
        <OutlineBridge />
      </SidebarContext.Provider>
    );
    const { rerender, unmount } = render(view(null));
    act(() => requestOutlineToggle());
    expect(toggleSidebar).toHaveBeenCalledWith(ID);
    rerender(view(ID));
    unmount();
    window.removeEventListener(STATE_EVENT, onState);
    expect(states).toEqual([
      { open: false, available: true }, { open: true, available: true }, { open: false, available: false },
    ]);
  });
});
