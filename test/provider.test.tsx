import { describe, it } from 'vitest';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RowndProvider } from '../src';

describe('it', () => {
  it('renders without crashing', () => {
    const body = document.createElement('body');
    const div = document.createElement('div');
    body.appendChild(div);
    ReactDOM.render(
      <RowndProvider
        appKey="foo"
        postRegistrationUrl="https://foobar"
        supertokens={{ appInfo: { apiDomain: 'https://api.example.com' } }}
      >
        <div />
      </RowndProvider>,
      div
    );
    ReactDOM.unmountComponentAtNode(div);
  });
});
