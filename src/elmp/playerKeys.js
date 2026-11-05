import { useEffect } from 'react';

import { requestOutlineToggle } from './outlineEvents';

// F-94 BR-2: ← / → previous / next unit, O toggles the outline — only when the learner is not typing
// or inside the lesson content (the content iframe keeps its own keys).
const TYPING = ['INPUT', 'TEXTAREA', 'SELECT', 'IFRAME', 'VIDEO', 'AUDIO'];

export const shortcutFor = (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) { return null; }
  const el = event.target;
  if (el && (el.isContentEditable || TYPING.includes(el.tagName) || el.closest?.('[role="slider"],[role="textbox"]'))) {
    return null;
  }
  if (event.key === 'ArrowLeft') { return 'prev'; }
  if (event.key === 'ArrowRight') { return 'next'; }
  // event.code keeps O working on a Thai keyboard layout too.
  if (!event.shiftKey && (event.code === 'KeyO' || event.key === 'o' || event.key === 'O')) { return 'outline'; }
  return null;
};

const clickNav = (cls) => {
  const button = document.querySelector(`.unit-navigation .${cls}`);
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') { return false; }
  button.click();
  return true;
};

export const runShortcut = (action) => {
  if (action === 'prev') { return clickNav('previous-button'); }
  if (action === 'next') { return clickNav('next-button'); }
  if (action === 'outline') { requestOutlineToggle(); return true; }
  return false;
};

export const usePlayerShortcuts = () => {
  useEffect(() => {
    const onKey = (event) => {
      const action = shortcutFor(event);
      if (action && runShortcut(action)) { event.preventDefault(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
};
