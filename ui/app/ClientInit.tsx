'use client';
import React from 'react';

export default function ClientInit() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swUrl = '/sw.js';
      navigator.serviceWorker.register(swUrl).catch(()=>{});
    }
  }, []);
  return null;
}
