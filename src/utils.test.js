const {
  exec,
  upload,
  uriParam,
  watermarkUri,
  addshaUri,
  preventcacheUri
} = require('./utils');

describe('exec tests', () => {
  test('exec is await and outputs hello', async () => {
    const output = await exec('echo', 'hello');
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

describe('uri tests', () => {
  test('uriParam', () => {
    const result = uriParam({
      uri: 'https://example.com/',
      param: 'test',
      value: 'works'
    });
    const url = new URL(result);

    expect(url.searchParams.get('test')).toBe('works');
  });
  test('watermarkUri', () => {
    const result = watermarkUri({
      uri: 'https://example.com/',
      type: 'pdf'
    });
    const url = new URL(result);

    expect(url.searchParams.get('cml')).toBe('pdf');
  });
  test('addshaUri', () => {
    const result = addshaUri({
      uri: 'https://example.com/',
      sha: 'deadbeef'
    });
    const url = new URL(result);

    expect(url.hash).toBe('#deadbeef');
  });
  test('preventcacheUri', () => {
    const result = preventcacheUri({
      uri: 'https://example.com/'
    });
    const url = new URL(result);
    expect(url.searchParams.get('cache-bypass')).not.toBeNull();
  });
});

describe('upload tests', () => {
  test('image/png', async () => {
    const { mime } = await upload({ path: 'assets/logo.png' });
    expect(mime).toBe('image/png');
  });

  test('application/pdf', async () => {
    const { mime } = await upload({ path: 'assets/logo.pdf' });
    expect(mime).toBe('application/pdf');
  });

  test('image/svg+xml', async () => {
    const { mime } = await upload({ path: 'assets/test.svg' });
    expect(mime).toBe('image/svg+xml');
  });
});
