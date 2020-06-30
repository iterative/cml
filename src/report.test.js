const REPORT = require('../src/report');

describe('Report tests', () => {
  test('Publish image', async () => {
    const path = './assets/logo.png';
    const md = false;
    const title = 'my title';

    const output = await REPORT.publish_file({ path, md, title });

    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish image md', async () => {
    const path = './assets/logo.png';
    const md = true;
    const title = 'my title';

    const output = await REPORT.publish_file({ path, md, title });

    expect(output.startsWith('![](https://')).toBe(true);
    expect(output.endsWith(` "${title}")`)).toBe(true);
  });

  test('Publish file md', async () => {
    const path = './assets/logo.pdf';
    const md = true;
    const title = 'my title';

    const output = await REPORT.publish_file({ path, md, title });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
  });
});
