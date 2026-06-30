import { beforeEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RowndProvider } from '../src';

describe('it', () => {
  beforeEach(() => {
    window._rphConfig = [];
    window.localStorage.clear();
    document
      .querySelectorAll('script[src*="/static/scripts/rph"]')
      .forEach((script) => script.remove());
  });

  it('renders without crashing', async () => {
    const body = document.createElement('body');
    const div = document.createElement('div');
    body.appendChild(div);
    ReactDOM.render(
      <RowndProvider
        appKey="foo"
        clientDomain="browser_local"
        postLoginRedirect="/profile"
        postRegistrationUrl="https://foobar"
        supertokens={{ appInfo: { apiDomain: 'https://api.example.com' } }}
      >
        <div />
      </RowndProvider>,
      div
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(window._rphConfig).toContainEqual([
      'setClientDomain',
      'browser_local',
    ]);
    expect(window._rphConfig).toContainEqual([
      'setPostLoginRedirect',
      '/profile',
    ]);
    ReactDOM.unmountComponentAtNode(div);
  });

});
