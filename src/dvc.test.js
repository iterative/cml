const fs = require('fs').promises;
const dvc = require('./dvc');
const { exec } = require('./utils');
const { INPUT_SKIP } = require('./settings');

afterAll(async () => {
  await exec('rm -rf .dvc');
});

describe('Remote', () => {
  test('Setup Google Storage credentials', async () => {
    const mock_data = {
      type: 'dummy_account',
      project_id: 'dummy-api-project',
      private_key_id: '',
      private_key: '',
      client_email: 'storage@dummy-api-project.iam.gserviceaccount.com',
      client_id: '115',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:
        'https://www.googleapis.com/robot/v1/metadata/x509/dummy-api-project.iam.gserviceaccount.com'
    };

    const GOOGLE_APPLICATION_CREDENTIALS = JSON.stringify(mock_data);

    await dvc.setup_credentials({ GOOGLE_APPLICATION_CREDENTIALS });

    const json = await fs.readFile(
      dvc.GOOGLE_APPLICATION_CREDENTIALS_PATH,
      'utf8'
    );

    expect(json).toBe(JSON.stringify(mock_data));
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      dvc.GOOGLE_APPLICATION_CREDENTIALS_PATH
    );
  });

  test('If not dvc_pull should return without throwing an exception', async () => {
    dvc.setup_credentials = jest.fn(dvc.setup_credentials);
    dvc.pull = jest.fn(dvc.pull);

    await dvc.setup_remote({ dvc_pull: INPUT_SKIP });
    expect(dvc.setup_credentials.mock.calls.length).toBe(1);
    expect(dvc.pull.mock.calls.length).toBe(0);
  });
});

describe('Dvc pull', () => {
  test('Empty targets with force', async () => {
    const opts = { force: true, targets: [] };
    try {
      await dvc.pull(opts);
    } catch (err) {}

    expect(opts.command).toBe('dvc pull -f');
  });

  test('Empty targets without force', async () => {
    const opts = { targets: ['one', 'two'] };
    try {
      await dvc.pull(opts);
    } catch (err) {}

    expect(opts.command).toBe('dvc pull one two');
  });

  test('Empty targets with force', async () => {
    const opts = { force: true, targets: ['one', 'two'] };
    try {
      await dvc.pull(opts);
    } catch (err) {}

    expect(opts.command).toBe('dvc pull -f one two');
  });
});
