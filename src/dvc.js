const fs = require('fs').promises;
const GOOGLE_APPLICATION_CREDENTIALS_PATH =
  '.dvc/tmp/GOOGLE_APPLICATION_CREDENTIALS.json';

const setup_credentials = async credentials => {
  const { GOOGLE_APPLICATION_CREDENTIALS } = credentials;

  if (GOOGLE_APPLICATION_CREDENTIALS) {
    await fs.mkdir('.dvc/tmp', { recursive: true });
    await fs.writeFile(
      GOOGLE_APPLICATION_CREDENTIALS_PATH,
      GOOGLE_APPLICATION_CREDENTIALS
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS_PATH;
  }
};

exports.GOOGLE_APPLICATION_CREDENTIALS_PATH = GOOGLE_APPLICATION_CREDENTIALS_PATH;
exports.setup_credentials = setup_credentials;
