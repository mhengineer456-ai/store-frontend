export const getBackendUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  if (!port || port === '5000') {
    return window.location.origin;
  }
  return `http://${hostname}:5000`;
};
