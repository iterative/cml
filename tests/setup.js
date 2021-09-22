const { startProxy, PORT } = require('./proxy');
module.exports = () => {
  process.env.http_proxy = `http://localhost:${PORT}`;
  startProxy();
};
