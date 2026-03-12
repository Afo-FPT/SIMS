'use client';

import { useEffect } from 'react';

export default function AuthResetOnLoad() {
  useEffect(() => {
    const authKeys = [
      'sws_persona',
      'sws_email',
      'sws_name',
      'sws_title',
      'sws_avatar',
      'sws_verified',
      'sws_token',
    ];

    authKeys.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem('login_email');
    sessionStorage.removeItem('login_role');
  }, []);

  return null;
}
