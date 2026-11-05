import { useEffect, useState } from 'react';

// The player top bar lives in the header slot, outside the courseware's SidebarContext. These window
// events connect its outline button to the sidebar (OutlineBridge, inside the context).
export const TOGGLE_EVENT = 'elmp:outline-toggle';
export const STATE_EVENT = 'elmp:outline-state';

let last = { open: false, available: false };

export const requestOutlineToggle = () => window.dispatchEvent(new CustomEvent(TOGGLE_EVENT));

export const announceOutlineState = (state) => {
  last = { open: Boolean(state.open), available: Boolean(state.available) };
  window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: last }));
};

export const useOutlineState = () => {
  const [state, setState] = useState(last);
  useEffect(() => {
    const onState = (event) => setState(event.detail);
    window.addEventListener(STATE_EVENT, onState);
    setState(last);
    return () => window.removeEventListener(STATE_EVENT, onState);
  }, []);
  return state;
};
