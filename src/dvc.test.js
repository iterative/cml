const fs = require('fs').promises;
const dvc = require('./dvc');
const { exec } = require('./utils');

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
});
