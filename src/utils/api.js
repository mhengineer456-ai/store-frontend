export const getBackendUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // If we are running locally (on localhost or a local IP on port 5173/etc.)
  // we want to route to the local backend on port 5000.
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
  
  if (isLocal && port && port !== '5000') {
    return `http://${hostname}:5000`;
  }
  
  // In production (or if port is empty / not running locally), return the real Render backend URL
  return 'https://store-backend-1-ff8d.onrender.com';
};
