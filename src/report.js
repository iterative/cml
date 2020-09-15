const { upload } = require('./utils');
const { upload: gl_upload } = require('./gitlab');

const publish_file = async (opts) => {
  const { md = false, title = '', gitlab_uploads } = opts;

  let mime, uri;

  if (gitlab_uploads) {
    ({ mime, uri } = await gl_upload(opts));
  } else {
    ({ mime, uri } = await upload(opts));
  }

  if (md && mime.match('(image|video)/.*'))
    return `![](${uri}${title ? ` "${title}"` : ''})`;
  if (md) return `[${title}](${uri})`;

  return uri;
};

exports.publish_file = publish_file;
