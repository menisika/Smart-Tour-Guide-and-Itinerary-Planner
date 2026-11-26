// @vitest-environment jsdom
import { supportedLocales, translate, type Locale, type MessageKey } from '@promenade/i18n';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../i18n/LocaleProvider';
import type { DeviceDatabaseState } from '../storage/device-database';
import { DeviceDatabaseContext } from '../storage/DeviceDatabaseContext';
import { DeviceDatabaseProvider } from '../storage/DeviceDatabaseProvider';
import { openNodeDatabase } from '../storage/testing/node-sqlite';
import { OutingScreen } from './OutingScreen';
import { ProfileScreen } from './ProfileScreen';
import { RoutesScreen } from './RoutesScreen';
import { SettingsScreen } from './SettingsScreen';

// The router needs a navigation container around it; a screen needs only to
// say where its links lead.
vi.mock('expo-router', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const tabs: readonly {
  name: string;
  Screen: ComponentType;
  title: MessageKey;
  body: MessageKey;
}[] = [
  { name: 'Routes', Screen: RoutesScreen, title: 'routes.title', body: 'routes.empty' },
  { name: 'Outing', Screen: OutingScreen, title: 'outing.title', body: 'outing.none' },
  { name: 'Profile', Screen: ProfileScreen, title: 'profile.title', body: 'profile.empty' },
];

function renderIn(locale: Locale, children: ReactNode) {
  return render(<LocaleProvider locale={locale}>{children}</LocaleProvider>);
}

describe.each(supportedLocales)('the shell on the web, in "%s"', (locale) => {
  it.each(tabs)('renders the $name tab', ({ Screen, title, body }) => {
    renderIn(locale, <Screen />);

    const main = screen.getByRole('main', { name: translate(locale, title) });
    const heading = within(main).getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe(translate(locale, title));
    expect(within(main).getByText(translate(locale, body))).toBeTruthy();
  });

  it('leads from the Profile to the settings by a named link', () => {
    renderIn(locale, <ProfileScreen />);

    const link = screen.getByRole('link', { name: translate(locale, 'profile.openSettings') });
    expect(link.getAttribute('href')).toBe('/settings');
  });

  it('renders the settings: the languages, and no device data in a browser', () => {
    renderIn(
      locale,
      <DeviceDatabaseProvider>
        <SettingsScreen />
      </DeviceDatabaseProvider>,
    );

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      translate(locale, 'settings.title'),
    );
    const languages = within(
      screen.getByRole('list', { name: translate(locale, 'settings.language') }),
    ).getAllByRole('listitem');
    expect(languages.map((item) => item.textContent)).toEqual(['Русский', 'English']);
    expect(
      languages.find((item) => item.getAttribute('aria-current') === 'true')?.textContent,
    ).toBe(translate(locale, `language.${locale}`));
    expect(screen.getByRole('status').textContent).toBe(
      translate(locale, 'settings.deviceData.absent'),
    );
    expect(
      screen.getByRole('link', { name: translate(locale, 'settings.back') }).getAttribute('href'),
    ).toBe('/profile');
  });

  it.each<[DeviceDatabaseState['status'], string, string]>([
    ['opening', 'status', translate(locale, 'settings.deviceData.opening')],
    ['ready', 'status', translate(locale, 'settings.deviceData.ready', { version: 1 })],
    ['failed', 'alert', translate(locale, 'settings.deviceData.failed')],
  ])('says that the device data is %s', (status, role, text) => {
    const states: Record<string, DeviceDatabaseState> = {
      opening: { status: 'opening' },
      ready: { status: 'ready', database: openNodeDatabase(), schemaVersion: 1 },
      failed: { status: 'failed', error: new Error('disk full') },
    };

    renderIn(
      locale,
      <DeviceDatabaseContext value={states[status] ?? { status: 'absent' }}>
        <SettingsScreen />
      </DeviceDatabaseContext>,
    );

    expect(screen.getByRole(role).textContent).toBe(text);
  });

  it('gives every control a role and a name', () => {
    for (const Screen of [RoutesScreen, OutingScreen, ProfileScreen, SettingsScreen]) {
      const { container, unmount } = renderIn(locale, <Screen />);
      for (const control of container.querySelectorAll('a, button, input, select, [tabindex]')) {
        const name = control.getAttribute('aria-label') ?? control.textContent;
        expect(name.trim(), control.outerHTML).not.toBe('');
      }
      unmount();
    }
  });
});
