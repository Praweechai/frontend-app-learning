import { getConfig, mergeConfig } from '@edx/frontend-platform';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { PluginSlot } from '@openedx/frontend-plugin-framework';
import { render, screen } from '@testing-library/react';

import applyElmpPluginSlots from '.';

// The app's setupTest.js mocks the plugin framework for every test; this suite needs the real one.
jest.unmock('@openedx/frontend-plugin-framework');
jest.mock('./LearningHeader', () => function MockHeader() { return <div>elmp header</div>; });
jest.mock('./UnitHeading', () => function MockUnitTitle() { return <div>elmp unit title</div>; });

const FOOTER = 'org.openedx.frontend.layout.footer.v1';
const HEADER = 'org.openedx.frontend.layout.header_learning.v1';
const UNIT_TITLE = 'org.openedx.frontend.learning.unit_title.v1';

describe('ELMP slot wiring', () => {
  it('keeps slots that env.config.jsx already set and adds ours', () => {
    mergeConfig({ pluginSlots: { 'other.slot': { keepDefault: true, plugins: [] } } });

    applyElmpPluginSlots();

    const slots = getConfig().pluginSlots;
    expect(slots['other.slot']).toBeDefined();
    [FOOTER, HEADER, UNIT_TITLE].forEach((id) => expect(slots[id].keepDefault).toBe(false));
  });

  it('removes the Open edX footer', () => {
    applyElmpPluginSlots();
    render(
      <IntlProvider locale="en">
        <PluginSlot id={FOOTER} idAliases={['footer_slot']}><div>default footer</div></PluginSlot>
      </IntlProvider>,
    );
    expect(screen.queryByText('default footer')).toBeNull();
  });

  it('renders the Classroom header instead of the Open edX one', async () => {
    applyElmpPluginSlots();
    render(
      <IntlProvider locale="en">
        <PluginSlot id={HEADER} idAliases={['header_slot']}><div>default header</div></PluginSlot>
      </IntlProvider>,
    );
    expect(await screen.findByText('elmp header')).toBeInTheDocument();
    expect(screen.queryByText('default header')).toBeNull();
  });
});
