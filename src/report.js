const vega = require('vega');
const vegalite = require('vega-lite');

const { upload } = require('./utils');

const publish_vega = async opts => {
  const { data, md, title } = opts;
  const is_vega_lite = data.$schema.includes('vega-lite');
  const spec = is_vega_lite ? vegalite.compile(data).spec : data;
  const view = new vega.View(vega.parse(spec), { renderer: 'none' });

  const canvas = await view.toCanvas();

  const buffer = canvas.toBuffer();
  const output = await publish_file({ buffer, md, title });

  return output;
};

const publish_file = async opts => {
  const { md = false, title = '' } = opts;
  const { mime, uri } = await upload({ ...opts });

  if (md && mime.startsWith('image/'))
    return `![](${uri}${title ? ` "${title}"` : ''})`;
  if (md) return `[${title}](${uri})`;

  return uri;
};

exports.publish_vega = publish_vega;
exports.publish_file = publish_file;
