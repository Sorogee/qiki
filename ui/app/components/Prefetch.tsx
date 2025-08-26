'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function PrefetchLinks(){
  const router = useRouter();
  React.useEffect(()=>{
    const id = window.requestIdleCallback?.( () => {
      ['/feed','/search','/login','/settings/security'].forEach(p=>{
        // @ts-ignore
        router.prefetch?.(p);
      });
    }, { timeout: 2000 });
    return () => { if (id && window.cancelIdleCallback) window.cancelIdleCallback(id as any); };
  }, [router]);
  return null;
}
