// KudiSave Configuration
// Smart environment detection

(function() {
  const hostname = window.location.hostname;
  
  // Detect environment
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
  const isFileProtocol = window.location.protocol === 'file:';
  
  // PRODUCTION: Set your deployed backend URL here
  // Example: 'https://kudisave-api.onrender.com/api/v1'
  const PRODUCTION_API_URL = null; // Change to your production URL when deployed
  
  // Configure API URL
  if (PRODUCTION_API_URL) {
    // Production mode - backend deployed
    window.KUDISAVE_API_URL = PRODUCTION_API_URL;
    console.log('🚀 KudiSave: Production mode');
  } else if (isLocalhost || isFileProtocol) {
    // Local development
    window.KUDISAVE_API_URL = 'http://localhost:5000/api/v1';
    console.log('💻 KudiSave: Local development mode');
  } else {
    // Fallback to localhost backend
    window.KUDISAVE_API_URL = 'http://localhost:5000/api/v1';
    console.log('💻 KudiSave: Fallback to local backend');
  }
  
  // Log configuration
  console.log('Config:', {
    hostname,
    apiUrl: window.KUDISAVE_API_URL
  });
})();

// ===========================================
// DEPLOYMENT INSTRUCTIONS:
// ===========================================
// 1. Deploy backend to your hosting provider
// 2. Copy your backend URL
// 3. Update PRODUCTION_API_URL above to:
//    'https://YOUR-APP-NAME.onrender.com/api/v1'
// 4. Push to GitHub
// =========================================== 
