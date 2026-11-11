// ELMP Plan 5 · doc 10 §4.1 (V-4.03): the player side of bridge v2.
// The lesson iframe grows to its content, so the window scrolls, not the frame. The player therefore:
//  - tells the frame which part of it is on screen ({type: 'elmp.viewport', top, height}) → blocks fade in;
//  - listens for {type: 'elmp.requirements', left} → end-of-page card (what is still open on this page);
//  - listens for {type: 'elmp.scroll', top} → scrolls the window to that point of the lesson.
// Only messages from the LMS origin count; only the LMS origin receives ours.
import { useEffect, useState } from 'react';

const TOP_BAR = 72; // player top bar + a little air

export const lessonFrame = () => document.getElementById('unit-iframe');

// The part of the frame on screen, in the frame's own coordinates.
export const frameViewport = (frame, innerHeight = window.innerHeight) => {
  if (!frame) { return null; }
  const r = frame.getBoundingClientRect();
  const top = Math.max(0, -r.top);
  const height = Math.min(innerHeight, r.bottom) - Math.max(0, r.top);
  return height > 0 ? { top: Math.round(top), height: Math.round(height) } : { top: Math.round(top), height: 0 };
};

const say = (frame, msg, origin) => {
  try { frame?.contentWindow?.postMessage(msg, origin); } catch (e) { /* frame gone */ }
};

const reducedMotion = () => {
  try {
    return document.body.getAttribute('data-motion') === 'reduce'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { return false; }
};

// left: undefined = the frame has not said yet, null = no ELMP blocks on this page, [] = all done, [...] = still open
export default function useLessonBridge(lmsOrigin, unitId) {
  const [left, setLeft] = useState(undefined);

  useEffect(() => { setLeft(undefined); }, [unitId]);

  useEffect(() => {
    if (!lmsOrigin) { return undefined; }
    let frameReq = 0;
    let last = '';
    const sendViewport = (force) => {
      frameReq = 0;
      const frame = lessonFrame();
      const vp = frameViewport(frame);
      if (!vp || vp.height <= 0) { return; }
      const key = `${vp.top}:${vp.height}`;
      if (!force && key === last) { return; }
      last = key;
      say(frame, { type: 'elmp.viewport', ...vp }, lmsOrigin);
    };
    const onScroll = () => { if (!frameReq) { frameReq = requestAnimationFrame(() => sendViewport(false)); } };
    const onMessage = (event) => {
      if (event.origin !== lmsOrigin || !event.data) { return; }
      const frame = lessonFrame();
      if (!frame || event.source !== frame.contentWindow) { return; }
      const { type } = event.data;
      if (type === 'elmp.requirements') {
        const l = event.data.left;
        setLeft(Array.isArray(l) ? l.filter((k) => typeof k === 'string').slice(0, 50) : null);
        sendViewport(true); // the frame is ready: tell it what is on screen
      } else if (type === 'elmp.scroll') {
        const y = Number(event.data.top);
        if (!Number.isFinite(y)) { return; }
        const target = frame.getBoundingClientRect().top + window.scrollY + y - TOP_BAR;
        window.scrollTo({ top: Math.max(0, target), behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // ask once the frame is there (it also sends by itself when it starts)
    const ask = setTimeout(() => say(lessonFrame(), { type: 'elmp.ask' }, lmsOrigin), 800);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      clearTimeout(ask);
      if (frameReq) { cancelAnimationFrame(frameReq); }
    };
  }, [lmsOrigin, unitId]);

  return { left };
}
