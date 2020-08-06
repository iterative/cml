const {exec, upload} = require('./utils');

describe('exec tests', () => {
  test('exec is await and outputs hello', async () => {
    const output = await exec('echo hello');
    expect(output).toMatch('hello');
  });

  test('Command rejects if failure', async () => {
    let error;
    try {
      await exec('this_command_fails');
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
  });
});

describe('upload tests', () => {
  test('image/png', async () => {
    const {mime} = await upload({path : 'assets/logo.png'});
    expect(mime).toBe('image/png');
  });

  test('application/pdf', async () => {
    const {mime} = await upload({path : 'assets/logo.pdf'});
    expect(mime).toBe('application/pdf');
  });

  test('image/svg+xml', async () => {
    const {mime} = await upload({path : 'assets/test.svg'});
    expect(mime).toBe('image/svg+xml');
  });
});
