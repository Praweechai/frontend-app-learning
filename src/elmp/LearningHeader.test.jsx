import { fireEvent, render, screen } from '@testing-library/react';
import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { AppContext } from '@edx/frontend-platform/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import LearningHeader from './LearningHeader';
import setClassroomLanguage from './language';

const mockClient = { me: jest.fn() };
jest.mock('@elmp/classroom-kit', () => ({
  ...jest.requireActual('@elmp/classroom-kit'),
  getPortalClient: () => mockClient,
}));
jest.mock('./language', () => jest.fn());
jest.mock('./PlayerActivity', () => ({
  __esModule: true,
  default: () => null,
  originOf: (url) => { try { return new URL(url).origin; } catch (e) { return null; } },
  usePlayerActivity: () => ({
    idle: { state: 'active' },
    session: {
      seconds: 125, focusSeconds: 0, focusMin: 25, setFocusMin: () => {}, phase: 'learning',
    },
  }),
}));

// Plan 5 P5-4.02 — player 3 top bar in the learning app (S-105).
const COURSE = 'course-v1:MH+INF101+2026';
const state = {
  models: {
    coursewareMeta: { [COURSE]: { title: 'Infection Control', sectionIds: ['c1'] } },
    sequences: { s1: { id: 's1', unitIds: ['u1', 'u2'] } },
    units: { u1: { title: 'Video' }, u2: { title: 'Quiz: PPE' } },
  },
  courseware: {
    courseOutline: {
      sections: { c1: { sequenceIds: ['s1'] } },
      sequences: { s1: { id: 's1', title: 'Basics', unitIds: ['u1', 'u2'] } },
      units: { u1: { title: 'Video', complete: true }, u2: { title: 'Quiz: PPE' } },
    },
  },
};
const store = { getState: () => state, subscribe: () => () => {}, dispatch: () => {} };
const show = () => render(
  <IntlProvider locale="en">
    <AppContext.Provider value={{ authenticatedUser: { username: 'emp02417' } }}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/course/${COURSE}/s1/u1`]}>
          <LearningHeader />
          <div className="unit-navigation">
            <button type="button" className="previous-button" disabled>Back</button>
            <button type="button" className="next-button">Forward</button>
          </div>
        </MemoryRouter>
      </Provider>
    </AppContext.Provider>
  </IntlProvider>,
);

describe('LearningHeader — player 3 (P5-4.02)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockClient.me.mockResolvedValue({ data: {} });
    mergeConfig({ LMS_BASE_URL: 'http://local.openedx.io', ELMP_CLASSROOM_HOME_URL: '/learner-dashboard/' });
  });

  it('top bar: back to My Learning, course title, four tools (no dark mode); side arrows press the bottom buttons', () => {
    show();
    expect(screen.getByRole('link', { name: 'Back to My Learning' })).toHaveAttribute('href', '/learner-dashboard/');
    expect(screen.getByText('Infection Control')).toBeInTheDocument();
    ['Search in this course', 'Choose language', 'Accessibility options']
      .forEach((name) => expect(screen.getByRole('button', { name })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Dark mode' })).toBeNull(); // V-7.02: dark mode removed
    const next = document.querySelector('.unit-navigation .next-button');
    const click = jest.fn();
    next.addEventListener('click', click);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(click).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('display settings go on <body> while the player is open, and come off after', () => {
    const { unmount } = show();
    expect(document.body).toHaveClass('cls3-player-page');
    expect(document.body).toHaveAttribute('data-theme', 'light'); // V-7.02: always light
    unmount();
    expect(document.body).not.toHaveClass('cls3-player-page');
    expect(document.body).not.toHaveAttribute('data-theme');
  });

  it('search in course lists the units from the outline', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Search in this course' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search in this course' }), { target: { value: 'ppe' } });
    expect(screen.getByRole('link', { name: /Quiz: PPE/ })).toHaveAttribute('href', `/course/${COURSE}/s1/u2`);
  });

  it('language menu uses the Classroom language chain', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Choose language' }));
    fireEvent.click(screen.getByRole('option', { name: 'ไทย (Thai)' }));
    expect(setClassroomLanguage).toHaveBeenCalledWith('th', 'emp02417');
  });
});
