const { bin } = require('../../package.json');
const { exec } = require('../../src/utils');

const commands = Object.keys(bin)
  .filter((command) => command.startsWith('cml-'))
  .map((command) => command.replace('cml-', ''));

describe('command-line interface tests', () => {
  for (const command of commands)
    test(`legacy cml-${command} behaves as the new cml ${command}`, async () => {
      const legacyOutput = await exec(`cml-${command}`, '--help');
      const newOutput = await exec('cml', command, '--help');
      expect(legacyOutput).toBe(newOutput);
    });
});
