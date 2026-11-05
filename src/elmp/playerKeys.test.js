import { runShortcut, shortcutFor } from './playerKeys';
import { TOGGLE_EVENT } from './outlineEvents';

const key = (props, target = document.body) => ({
  defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, target, ...props,
});

describe('player shortcuts (F-94 BR-2)', () => {
  it('maps arrows and O (also on a Thai layout)', () => {
    expect(shortcutFor(key({ key: 'ArrowLeft' }))).toBe('prev');
    expect(shortcutFor(key({ key: 'ArrowRight' }))).toBe('next');
    expect(shortcutFor(key({ key: 'o', code: 'KeyO' }))).toBe('outline');
    expect(shortcutFor(key({ key: 'น', code: 'KeyO' }))).toBe('outline');
    expect(shortcutFor(key({ key: 'x' }))).toBeNull();
  });

  it('stays out of the way while typing, in content or with modifiers', () => {
    const input = document.createElement('input');
    const iframe = document.createElement('iframe');
    expect(shortcutFor(key({ key: 'ArrowLeft' }, input))).toBeNull();
    expect(shortcutFor(key({ key: 'ArrowRight' }, iframe))).toBeNull();
    expect(shortcutFor(key({ key: 'ArrowRight', ctrlKey: true }))).toBeNull();
    expect(shortcutFor(key({ key: 'o', code: 'KeyO', shiftKey: true }))).toBeNull();
  });

  it('presses the bottom bar buttons and toggles the outline', () => {
    document.body.innerHTML = '<div class="unit-navigation"><button class="previous-button" disabled>P</button>'
      + '<button class="next-button">N</button></div>';
    const next = jest.fn();
    document.querySelector('.next-button').addEventListener('click', next);
    expect(runShortcut('next')).toBe(true);
    expect(next).toHaveBeenCalled();
    expect(runShortcut('prev')).toBe(false);
    const toggled = jest.fn();
    window.addEventListener(TOGGLE_EVENT, toggled);
    expect(runShortcut('outline')).toBe(true);
    expect(toggled).toHaveBeenCalled();
    window.removeEventListener(TOGGLE_EVENT, toggled);
    document.body.innerHTML = '';
  });
});
