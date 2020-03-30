const { exec } = require('./utils');

describe('Exec', () => {
  test('exec is await and outputs hello', async () => {
    const output = await exec('echo hello');
    expect(output).toMatch('hello');
  });

  test('Command rejects if failure', async () => {
    await expect(exec('this_command_fails')).rejects.toThrow(
      'Command failed: this_command_fails\n/bin/sh: this_command_fails: command not found'
    );
  });
});
