export const getBackendUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Detect if the app is accessed locally (localhost or local IP)
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  
  if (isLocal && port && port !== '5000') {
    return `http://${hostname}:5000`;
  }
  
  // In production (deployed on Render/Vercel), return the explicit Render backend URL
  return 'https://store-backend-1-ff8d.onrender.com';
};
