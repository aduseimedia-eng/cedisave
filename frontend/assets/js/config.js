// KudiSave Configuration
// Smart environment detection - works on GitHub Pages AND with Render backend

(function() {
  const hostname = window.location.hostname;
  
  // Detect environment
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  const isGitHubPages = hostname.includes('github.io');
  const isFileProtocol = window.location.protocol === 'file:';
  
  // PRODUCTION: Set your Render backend URL here after deployment
  // Example: 'https://kudisave-api.onrender.com/api/v1'
  const RENDER_API_URL = null; // Change to your Render URL when deployed
  
  // Configure API URL and Demo Mode
  if (RENDER_API_URL) {
    // Production mode - backend deployed to Render
    window.KUDISAVE_API_URL = RENDER_API_URL;
    window.KUDISAVE_DEMO_MODE = false;
    console.log('🚀 KudiSave: Production mode - using Render backend');
  } else if (isLocalhost || isFileProtocol) {
    // Local development with backend (localhost or file:// protocol)
    window.KUDISAVE_API_URL = 'http://localhost:5000/api/v1';
    window.KUDISAVE_DEMO_MODE = false;
    console.log('💻 KudiSave: Local development mode');
  } else if (isGitHubPages) {
    // GitHub Pages without Render backend - use demo mode
    window.KUDISAVE_API_URL = null;
    window.KUDISAVE_DEMO_MODE = true;
    console.log('🎮 KudiSave: Demo mode - data stored locally');
  } else {
    // Unknown environment - try localhost backend
    window.KUDISAVE_API_URL = 'http://localhost:5000/api/v1';
    window.KUDISAVE_DEMO_MODE = false;
    console.log('💻 KudiSave: Fallback to local backend');
  }
  
  // Log configuration
  console.log('Config:', {
    hostname,
    apiUrl: window.KUDISAVE_API_URL,
    demoMode: window.KUDISAVE_DEMO_MODE
  });
})();

// ===========================================
// DEPLOYMENT INSTRUCTIONS:
// ===========================================
// 1. Deploy backend to Render
// 2. Copy your Render URL
// 3. Update RENDER_API_URL above to:
//    'https://YOUR-APP-NAME.onrender.com/api/v1'
// 4. Push to GitHub - demo mode will be disabled
// =========================================== 
