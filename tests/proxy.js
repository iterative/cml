const ProxyServer = require('transparent-proxy');

const PORT = 9093;
const startProxy = () => {
  if (global.proxyTestsServer) return;

  global.proxyTestsServer = new ProxyServer();
  global.proxyTestsServer.listen(PORT, '0.0.0.0', () =>
    console.log(`Proxy listening on port ${PORT}`)
  );
};
const stopProxy = () => {
  global.proxyTestsServer.close();
};

module.exports = {
  startProxy,
  stopProxy,
  PORT
};
