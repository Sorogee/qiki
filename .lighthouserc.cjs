/** Lighthouse CI config for local + CI use */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      numberOfRuns: 1,
      // You can override this in CI by setting LHCI_START_CMD
      startServerCommand: process.env.LHCI_START_CMD || 'npm run start -- -p 3000',
      // Match a variety of common server-ready log lines (Next.js, Vite, Express, etc.)
      startServerReadyPattern: 'ready - started server|Started server on|Local:|listening on|server running|Compiled successfully|Now listening',
      startServerTimeout: 180000,
      settings: { chromeFlags: '--no-sandbox' },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
    },
  },
};
