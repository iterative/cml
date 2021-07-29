const { stopProxy } = require('./proxy');
module.exports = () => {
  console.log('Teardown Jest. Stoping Proxy...');
  stopProxy();
};
