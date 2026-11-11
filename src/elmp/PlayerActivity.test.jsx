import { act, render, screen } from '@testing-library/react';
import { mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import PlayerActivity, { originOf, pauseLessons, usePlayerActivity } from './PlayerActivity';

const mockClient = { me: jest.fn(), activity: jest.fn(), activityUrl: () => 'http://portal.local.openedx.io/api/classroom/v1/activity' };
jest.mock('@elmp/classroom-kit', () => ({
  ...jest.requireActual('@elmp/classroom-kit'),
  getPortalClient: () => mockClient,
}));

const LMS = 'http://local.openedx.io';
const KEY = 'course-v1:MH+INF101+2026';
const me = (inactivity) => ({ data: { features: { inactivity } } });
const Harness = () => <PlayerActivity activity={usePlayerActivity(KEY)} />;
const show = () => render(<IntlProvider locale="en"><Harness /></IntlProvider>);
const tick = async (s) => { await act(async () => { jest.advanceTimersByTime(s * 1000); }); };

describe('PlayerActivity (P4-6.02 · F-117, A4-9 with the 20 s test setting)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-06T03:00:00Z') });
    jest.clearAllMocks();
    mergeConfig({ LMS_BASE_URL: LMS });
    mockClient.activity.mockResolvedValue({});
  });
  afterEach(() => jest.useRealTimers());

  it('idle → "Still there?" → paused + videos told to pause; I am here resumes; seconds go to CA-12', async () => {
    mockClient.me.mockResolvedValue(me({ enabled: true, idle_seconds: 20 }));
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const post = jest.spyOn(frame.contentWindow, 'postMessage');
    show();
    await act(async () => {}); // /me loaded
    await tick(19);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await tick(1);
    expect(screen.getByRole('alertdialog', { name: 'Are you still there?' })).toBeInTheDocument();
    await tick(60);
    expect(screen.getByRole('alertdialog', { name: 'Paused — continue when ready' })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith({ type: 'elmp.pause' }, LMS);
    await act(async () => { screen.getByRole('button', { name: 'Continue learning' }).click(); });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    // a playing video (bridge beat from the LMS) keeps the learner active
    for (let i = 0; i < 4; i += 1) {
      act(() => { window.dispatchEvent(new MessageEvent('message', { data: { type: 'elmp.activity', kind: 'video-playing' }, origin: LMS })); });
      // eslint-disable-next-line no-await-in-loop
      await tick(15);
    }
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mockClient.activity).toHaveBeenCalledWith(expect.objectContaining({ courseKey: KEY, day: '2026-11-06' }));
    frame.remove();
  });

  it('switched off in the Portal, or Portal down: no timer', async () => {
    mockClient.me.mockResolvedValue(me({ enabled: false, idle_seconds: 20 }));
    const { unmount } = show();
    await act(async () => {});
    await tick(120);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    unmount();
    mockClient.me.mockRejectedValue(new Error('down'));
    show();
    await act(async () => {});
    await tick(400);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(mockClient.activity).not.toHaveBeenCalled();
  });

  it('Player 4: focus block → break: videos paused, no idle warning and no clock during the break', async () => {
    window.localStorage.setItem('elmp.focusMin', '15');
    mockClient.me.mockResolvedValue(me({ enabled: true, idle_seconds: 300 }));
    const frame = document.createElement('iframe');
    document.body.appendChild(frame);
    const post = jest.spyOn(frame.contentWindow, 'postMessage');
    show();
    await act(async () => {});
    for (let i = 0; i < 4 * 15; i += 1) { // 15 min of a playing video keeps the learner active
      act(() => { window.dispatchEvent(new MessageEvent('message', { data: { type: 'elmp.activity', kind: 'video-playing' }, origin: LMS })); });
      // eslint-disable-next-line no-await-in-loop
      await tick(15);
    }
    expect(screen.getByRole('dialog', { name: 'Time for a short break' })).toBeInTheDocument();
    await act(async () => { screen.getByRole('button', { name: 'Take 5 minutes' }).click(); });
    expect(screen.getByRole('dialog', { name: 'On a break' })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith({ type: 'elmp.pause' }, LMS);
    await tick(240); // 4 quiet minutes: no "still there?" during a break
    expect(screen.queryByRole('alertdialog')).toBeNull();
    await act(async () => { screen.getByRole('button', { name: 'I’m back' }).click(); });
    expect(screen.queryByRole('dialog')).toBeNull();
    window.localStorage.removeItem('elmp.focusMin');
    frame.remove();
  });

  it('helpers', () => {
    expect(originOf('http://local.openedx.io/x')).toBe(LMS);
    expect(originOf('nope')).toBeNull();
    expect(() => pauseLessons(null)).not.toThrow();
  });
});
