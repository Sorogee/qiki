'use client';
import React from 'react';

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<any>(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  if (!visible) return null;
  return <button onClick={() => { deferred.prompt(); setVisible(false); }} style={{position:'fixed', bottom:72, right:16, padding:'10px 14px', border:'1px solid #333', background:'#000', color:'#fff', borderRadius:8}}>Install app</button>;
}

export default function MobileNav() {
  return (
    <nav style={{position:'fixed', bottom:0, left:0, right:0, background:'#000', borderTop:'1px solid #222', display:'flex', justifyContent:'space-around', padding:'8px 0'}}>
      <a href="/" style={{color:'#fff', textDecoration:'none', padding:10}}>Home</a>
      <a href="/inbox" style={{color:'#fff', textDecoration:'none', padding:10}}>Inbox</a>
      <a href="/communities" style={{color:'#fff', textDecoration:'none', padding:10}}>Communities</a>
      <a href="/settings" style={{color:'#fff', textDecoration:'none', padding:10}}>Me</a>
    </nav>
  );
}
