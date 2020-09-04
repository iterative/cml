const { upload } = require('./utils');

const publish_file = async (opts) => {
  const { md = false, title = '' } = opts;
  const { mime, uri } = await upload({ ...opts });

  if (md && mime.startsWith('image/'))
    return `![](${uri}${title ? ` "${title}"` : ''})`;
  if (md) return `[${title}](${uri})`;

  return uri;
};

exports.publish_file = publish_file;
