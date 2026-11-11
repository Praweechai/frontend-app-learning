import {
  act, render, screen, renderHook,
} from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import { EndCard, LinkContext } from '@elmp/classroom-kit';
import useLessonBridge, { frameViewport } from './lessonBridge';
import { neighbours } from './LessonEnd';

// Plan 5 · V-4.03 — player side of bridge v2 (doc 10 §4.1).
const LMS = 'http://local.openedx.io';

function lessonFrameAt(rect) {
  const frame = document.createElement('iframe');
  frame.id = 'unit-iframe';
  document.body.appendChild(frame);
  frame.getBoundingClientRect = () => rect;
  return frame;
}
const fromFrame = (frame, data, origin = LMS) => act(() => {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: frame.contentWindow }));
});

afterEach(() => { document.body.innerHTML = ''; jest.useRealTimers(); });

describe('frameViewport', () => {
  it('is the part of the frame on screen, in frame coordinates', () => {
    const at = (top, bottom) => ({ getBoundingClientRect: () => ({ top, bottom }) });
    expect(frameViewport(at(120, 3000), 900)).toEqual({ top: 0, height: 780 });
    expect(frameViewport(at(-1500, 1500), 900)).toEqual({ top: 1500, height: 900 });
    expect(frameViewport({ getBoundingClientRect: () => ({ top: -2000, bottom: -10 }) }, 900).height).toBe(0);
    expect(frameViewport(null)).toBeNull();
  });
});

describe('useLessonBridge', () => {
  it('requirements from the lesson frame only; viewport goes back to the frame; resets per unit', () => {
    const frame = lessonFrameAt({ top: 80, bottom: 2000 });
    const post = jest.spyOn(frame.contentWindow, 'postMessage');
    const { result, rerender } = renderHook(({ unit }) => useLessonBridge(LMS, unit), { initialProps: { unit: 'u1' } });
    expect(result.current.left).toBeUndefined();
    fromFrame(frame, { type: 'elmp.requirements', left: ['video', 'quiz-check'] }, 'http://evil.example');
    expect(result.current.left).toBeUndefined();
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'elmp.requirements', left: [] }, origin: LMS, source: window }));
    expect(result.current.left).toBeUndefined(); // not from the lesson frame
    fromFrame(frame, { type: 'elmp.requirements', left: ['video', 'quiz-check', 7] });
    expect(result.current.left).toEqual(['video', 'quiz-check']);
    expect(post).toHaveBeenCalledWith({ type: 'elmp.viewport', top: 0, height: window.innerHeight - 80 }, LMS);
    fromFrame(frame, { type: 'elmp.requirements', left: null });
    expect(result.current.left).toBeNull();
    rerender({ unit: 'u2' });
    expect(result.current.left).toBeUndefined();
  });

  it('scroll request scrolls the window to that point of the lesson; asks the frame once it is there', () => {
    jest.useFakeTimers();
    const frame = lessonFrameAt({ top: 100, bottom: 3000 });
    const post = jest.spyOn(frame.contentWindow, 'postMessage');
    window.scrollTo = jest.fn();
    renderHook(() => useLessonBridge(LMS, 'u1'));
    fromFrame(frame, { type: 'elmp.scroll', top: 640 });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 100 + 640 - 72, behavior: expect.any(String) });
    fromFrame(frame, { type: 'elmp.scroll', top: 'x' });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(900); });
    expect(post).toHaveBeenCalledWith({ type: 'elmp.ask' }, LMS);
  });

  it('does nothing without an LMS origin', () => {
    const { result } = renderHook(() => useLessonBridge(null, 'u1'));
    expect(result.current.left).toBeUndefined();
  });
});

describe('LessonEnd pieces', () => {
  const units = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }];

  it('neighbours', () => {
    expect(neighbours(units, 'b')).toEqual({ current: units[1], prev: units[0], next: units[2] });
    expect(neighbours(units, 'a').prev).toBeNull();
    expect(neighbours(units, 'z').current).toBeNull();
  });

  it('end card with router links: what is left, then Next', () => {
    const Link = ({ href, children, ...rest }) => <a href={`#${href}`} {...rest}>{children}</a>; // eslint-disable-line
    render(
      <IntlProvider locale="en">
        <MemoryRouter>
          <LinkContext.Provider value={Link}>
            <EndCard
              left={['video']}
              next={{
                id: 'c', title: 'The 5 moments', href: '/course/x/s/c', number: '1.3',
              }}
            />
          </LinkContext.Provider>
        </MemoryRouter>
      </IntlProvider>,
    );
    expect(screen.getByText('Watch the video to 95%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /The 5 moments/ })).toHaveAttribute('href', '#/course/x/s/c');
  });
});
