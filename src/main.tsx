import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Detect the base path dynamically so the app works at any URL path
// This makes the app "spin-off ready" - it works at /, /braintrust-ai/, or anywhere else
const getBasename = () => {
  // Check if we're running under a subpath by looking at the script src
  const scripts = document.getElementsByTagName('script');
  for (const script of scripts) {
    const src = script.src;
    if (src && src.includes('/assets/')) {
      // Extract the base path from the script URL
      // e.g., "https://makexnow.com/braintrust-ai/assets/index.js" -> "/braintrust-ai"
      const url = new URL(src);
      const assetsIndex = url.pathname.indexOf('/assets/');
      if (assetsIndex > 0) {
        const basePath = url.pathname.substring(0, assetsIndex);
        return basePath || '/';
      }
    }
  }
  // Fallback: use the BASE_URL from Vite (works for standalone deployments)
  const baseUrl = import.meta.env.BASE_URL;
  if (baseUrl && baseUrl !== './' && baseUrl !== '/') {
    return baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  return '/';
};

const basename = getBasename();
console.log('[BrainTrust] Detected basename:', basename);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
