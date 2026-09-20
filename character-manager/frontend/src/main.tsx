import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Read-only offline mode: a service worker keeps the last-loaded pages and
// data readable when the network is gone. Production only -- caching in dev
// would serve yesterday's code with perfect confidence.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* An uncontrolled page is just the app as it was before. */
    })
  })
}
