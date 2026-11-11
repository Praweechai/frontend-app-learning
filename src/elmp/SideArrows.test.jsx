import { act, render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { MemoryRouter } from 'react-router-dom';

import SideArrows from './SideArrows';
import { announceOutlineState } from './outlineEvents';

// P5-6 live review: the Previous arrow sat on top of the docked outline panel.
const show = () => render(
  <IntlProvider locale="en">
    <MemoryRouter initialEntries={['/course/c/s1/u1']}>
      <SideArrows onPrev={() => {}} onNext={() => {}} />
    </MemoryRouter>
  </IntlProvider>,
);

const sidePanel = (id, cls, right) => {
  const el = document.createElement('div');
  if (id) { el.id = id; }
  el.className = cls;
  el.getBoundingClientRect = () => ({ right });
  document.body.appendChild(el);
  return el;
};

describe('SideArrows — Previous arrow beside the outline', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('sits at the window edge when nothing is docked on the left', () => {
    show();
    expect(screen.getByRole('button', { name: /previous/i }).style.left).toBe('12px');
  });

  it('moves just right of the docked outline panel, and of the rail when the outline closes', () => {
    const panel = sidePanel('elmp-outline', 'cls3-outline', 332);
    announceOutlineState({ open: true, available: true });
    show();
    expect(screen.getByRole('button', { name: /previous/i }).style.left).toBe('344px');
    panel.remove();
    sidePanel(null, 'cls-rail', 40);
    act(() => { announceOutlineState({ open: false, available: true }); });
    expect(screen.getByRole('button', { name: /previous/i }).style.left).toBe('52px');
  });

  it('ignores the outline when it floats over the page (phones, full screen)', () => {
    sidePanel('elmp-outline', 'cls3-outline cls3-outline--overlay', 340);
    show();
    expect(screen.getByRole('button', { name: /previous/i }).style.left).toBe('12px');
  });
});
