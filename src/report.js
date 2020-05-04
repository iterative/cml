const json_2_mdtable = require('json-to-markdown-table2');
const numeral = require('numeral');
const _ = require('underscore');
var showdown = require('showdown');
const vega = require('vega');
const vegalite = require('vega-lite');

const { upload } = require('./utils');

const METRICS_FORMAT = '0[.][0000000]';
const MAX_CHARS = 65000;

const metrics_format = () => {
  return this.METRICS_FORMAT;
};

const setup_env_vars = () => {
  return 'Please [setup rev environment variable](https://github.com/iterative/dvc-cml#env-variables) accordingly';
};

const no_tag_warning = () => {
  return `> :warning: Without a \`\`\`tag_prefix\`\`\` "Last 5 experiments" list won't be listed\n${setup_env_vars()}`;
};

const same_warning = from => {
  return `>:warning: You are comparing ref ${from} with itself, no diff available. \n${setup_env_vars()}`;
};

const sha_short = sha => {
  return sha.slice(0, 7);
};

const header_md = opts => {
  const { from, sha_from, sha_to } = opts;
  const is_same = sha_from === sha_to;
  const warn = is_same ? exports.same_warning(from) : '';
  const summary = `### Baseline: ${from} ( ${sha_short(
    sha_from
  )} vs ${sha_short(sha_to)} ) \n${warn}`;

  return summary;
};

const dvc_diff_report_md = (data, max_chars) => {
  if (!data || !Object.keys(data).length) return 'No metrics available';

  let summary = '';

  const { added, modified, deleted } = data;
  const sections = [
    { lbl: 'Added', files: added },
    { lbl: 'Modified', files: modified },
    { lbl: 'Deleted', files: deleted }
  ];

  const warn =
    '\n:warning: Report excedeed the maximun amount of allowed chars';
  sections.forEach(section => {
    summary += `<details>\n<summary>${section.lbl}: ${section.files.length}</summary>\n\n`;
    summary += `#SECTION${section.lbl}#\n${warn}</details>\n`;
  });

  let count = summary.length;

  sections.forEach(section => {
    section.summary = '';

    section.files.forEach(file => {
      const file_text = ` - ${file.path} \n`;
      count += file_text.length;

      if (count < max_chars) section.summary += file_text;
    });

    summary = summary.replace(`#SECTION${section.lbl}#`, section.summary);
    if (count < max_chars) summary = summary.replace(warn, '');
  });

  return summary;
};

const dvc_metrics_diff_report_md = data => {
  const format = metrics_format();

  if (!data || !Object.keys(data).length) return 'No metrics available';

  const values = [];

  for (const path in data) {
    const output = data[path];
    for (const metric in output) {
      const new_ = numeral(output[metric].new).format(format);
      const old = numeral(output[metric].old).format(format);

      const arrow = output[metric].diff > 0 ? '+' : '';
      const diff = output[metric].diff
        ? `${arrow}${numeral(output[metric].diff).format(format)}`
        : 'no available';

      values.push({ path, metric, old, new: new_, diff });
    }
  }

  const summary = `\n${json_2_mdtable(values)}`;

  return summary;
};

const others_report_md = (others, no_tag) => {
  if (no_tag) no_tag_warning();
  if (!others.length) return 'No other experiments available';

  const max = 5;
  let summary = `<details><summary>Experiments</summary>\n\n 
  Latest ${Math.min(others.length, max)} experiments in the branch:\n`;

  _.last(others, max).forEach(other => {
    if (other.link && other.label)
      summary += ` - [${other.label}](${other.link})\n`;
    else summary += ` - ${sha_short(other)}\n`;
  });

  summary += '\n</details>';

  return summary;
};

const dvc_report_md = opts => {
  const {
    from,
    to,
    sha_from,
    sha_to,
    dvc_diff,
    dvc_metrics_diff,
    others = [],
    no_tag = false
  } = opts;

  const header = header_md({ from, to, sha_from, sha_to });
  const metrics_diff_md = dvc_metrics_diff_report_md(dvc_metrics_diff);
  const others_md = others_report_md(others, no_tag);
  const diff_md = dvc_diff_report_md(
    dvc_diff,
    MAX_CHARS - (metrics_diff_md.length + others_md.length)
  );

  const summary = `${header} \n\n#### Metrics \n\n ${metrics_diff_md} \n\n#### Data \n\n${diff_md} \n\n#### Other experiments \n${others_md}`;

  return summary;
};

const md_to_html = markdown => {
  const converter = new showdown.Converter({ tables: true });
  converter.setFlavor('github');
  const html = converter.makeHtml(markdown);

  return `
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
		<title>DVC Report</title>
		<link rel="stylesheet" href="report.css">
		<style>
			body {
				box-sizing: border-box;
				min-width: 200px;
				max-width: 980px;
				margin: 0 auto;
				padding: 45px;
			}
		</style>
	</head>
	<body>
      <div class="markdown-body" id="content">
        ${html}
      </div>
  </body>
</html>
`;
};

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

  console.error(mime);
  if (md && mime.startsWith('image/'))
    return `![](${uri}${title ? ` "${title}"` : ''})`;
  if (md) return `[${title}](${uri})`;

  return uri;
};

exports.METRICS_FORMAT = METRICS_FORMAT;
exports.dvc_report_md = dvc_report_md;
exports.md_to_html = md_to_html;
exports.no_tag_warning = no_tag_warning;
exports.same_warning = same_warning;
exports.dvc_metrics_diff_report_md = dvc_metrics_diff_report_md;
exports.dvc_diff_report_md = dvc_diff_report_md;
exports.publish_vega = publish_vega;
exports.publish_file = publish_file;
