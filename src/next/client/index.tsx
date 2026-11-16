'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { HubListenerProps, RowndProviderProps } from '../../context/RowndContext';
import { store } from './store';
import HubScriptInjector from '../../context/HubScriptInjector/HubScriptInjector';
import useHub from '../../hooks/useHub';
import { TRowndContext } from '../../context/types';
import { subscribeCookieSync } from './cookieSync';

const Client: React.FC<Omit<RowndProviderProps, 'children'>> = (props) => {
  const { setInitialHubState, hubListenerCb } = useHub();

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    store.setState(setInitialHubState());
    hasInitialized.current = true;
  }, []);

  const setState: (
    partial:
      | Partial<TRowndContext>
      | ((state: TRowndContext) => Partial<TRowndContext>)
  ) => void = useCallback(
    (partial) => {
      store.setState(partial);
    },
    [store]
  );

  useEffect(() => subscribeCookieSync(), []);

  const stateListener = useCallback(({ state, api }: HubListenerProps) => {
    hubListenerCb({
      state,
      api,
      callback: setState,
    })
  }, [hubListenerCb, setState]);

  return (
    <>
      <HubScriptInjector
        stateListener={stateListener}
        {...props}
      />
    </>
  );
};

export default Client;
