'use client';

import { useEffect } from 'react';
import { subscribeCookieSync } from '../cookieSync';

const RowndServerStateSync = () => {
  useEffect(() => subscribeCookieSync(true), []);
  return null;
};

export default RowndServerStateSync;
