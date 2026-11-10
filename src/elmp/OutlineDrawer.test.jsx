import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import SidebarContext from '../courseware/course/sidebar/SidebarContext';
import { ID } from '../courseware/course/sidebar/sidebars/course-outline/constants';
import { useCourseOutlineSidebar } from '../courseware/course/sidebar/sidebars/course-outline/hooks';
import {
  ElmpOutlineDrawer, OutlineBridge, drawerOutline, outlineProgress,
} from './OutlineDrawer';
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

describe('ElmpOutlineDrawer (P5-4.02 · F-136; P4-6 · F-116)', () => {
  const store = { getState: () => ({ models: { coursewareMeta: {} } }), subscribe: () => () => {}, dispatch: () => {} };
  const base = {
    courseId: 'course-v1:MH+INF101+2026',
    unitId: 'u1',
    isActiveEntranceExam: false,
    sections: { c1: { sequenceIds: ['s1', 's2'] } },
    sequences: { s1: { id: 's1', title: 'Basics', unitIds: ['u1'] }, s2: { id: 's2', title: 'Practice', unitIds: ['u2'] } },
    units: { u1: { title: 'Video', complete: true }, u2: { title: 'Quiz' } },
    handleUnitClick: jest.fn(),
  };
  const show = () => render(
    <IntlProvider locale="en"><MemoryRouter><Provider store={store}><ElmpOutlineDrawer /></Provider></MemoryRouter></IntlProvider>,
  );

  it('open (Plan 5 panel): course progress, modules with %, numbered units 1.1 / 2.1, unit click', () => {
    useCourseOutlineSidebar.mockReturnValue({
      ...base, currentSidebar: ID, handleToggleCollapse: jest.fn(), shouldDisplayFullScreen: false,
    });
    const { container } = show();
    expect(screen.getByRole('progressbar', { name: 'Course progress' })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('button', { name: /Basics.*100%/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Practice.*0%/ }));
    expect([...container.querySelectorAll('.cls3-unit__num')].map((n) => n.textContent)).toEqual(['1.1', '2.1']);
    fireEvent.click(screen.getByRole('link', { name: /Quiz/ }));
    expect(base.handleUnitClick).toHaveBeenCalledWith({ sequenceId: 's2', activeUnitId: 'u1', id: 'u2' });
    expect(outlineProgress([{ items: [{ complete: true }, {}] }, { items: [] }])).toBe(50);
  });

  it('phone: overlay panel with a close button', () => {
    const handleToggleCollapse = jest.fn();
    useCourseOutlineSidebar.mockReturnValue({
      ...base, currentSidebar: ID, handleToggleCollapse, shouldDisplayFullScreen: true,
    });
    show();
    expect(screen.getByRole('complementary')).toHaveClass('cls3-outline--overlay');
    fireEvent.click(screen.getByRole('button', { name: 'Close course outline' }));
    expect(handleToggleCollapse).toHaveBeenCalled();
  });

  it('hidden on a wide screen: the rail brings it back', () => {
    const handleToggleCollapse = jest.fn();
    useCourseOutlineSidebar.mockReturnValue({
      ...base, currentSidebar: null, handleToggleCollapse, shouldDisplayFullScreen: false,
    });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Show course outline' }));
    expect(handleToggleCollapse).toHaveBeenCalled();
  });

  it('hidden on a phone or during an entrance exam: nothing (the top bar button stays)', () => {
    useCourseOutlineSidebar.mockReturnValue({
      ...base, currentSidebar: null, handleToggleCollapse: jest.fn(), shouldDisplayFullScreen: true,
    });
    const { container, unmount } = show();
    expect(container).toBeEmptyDOMElement();
    unmount();
    useCourseOutlineSidebar.mockReturnValue({ ...base, isActiveEntranceExam: true, currentSidebar: ID });
    expect(show().container).toBeEmptyDOMElement();
  });
});
