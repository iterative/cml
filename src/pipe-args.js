const fs = require('fs');

module.exports.piped = false;
module.exports.pipedArg = () => {
  const { argv } = process;

  return this.piped ? argv[argv.length - 1] : undefined;
};

module.exports.load = (format) => {
  const chunks = [];
  const BUFSIZE = 65536;
  let buffer;
  let nbytes = 0;

  while (true) {
    if (process.stdin.isTTY) break;

    try {
      buffer = Buffer.alloc(BUFSIZE);
      nbytes = fs.readSync(0, buffer, 0, BUFSIZE, null);

      if (nbytes === 0) break;

      chunks.push(buffer.slice(0, nbytes));
    } catch (err) {
      if (err.code === 'EOF') break; // HACK: see nodejs/node#35997
      if (err.code !== 'EAGAIN') throw err;
    }
  }

  const stdin = Buffer.concat(chunks).toString(format);
  if (stdin.length) {
    process.argv.push(stdin.trim());
    this.piped = true;
  }
};
