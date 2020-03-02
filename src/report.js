const json_2_mdtable = require('json-to-markdown-table2');
const numeral = require('numeral');
const _ = require('underscore');

const MAX_CHARS = 65000;
const METRICS_FORMAT = '0[.][0000000]';

const dvc_diff_report_md = (data, max_chars) => {
  if (!data) return 'No metrics available';

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
      const file_text = ` - <font size="2">${file.path}</font> \n`;
      count += file_text.length;

      if (count < max_chars) section.summary += file_text;
    });

    summary = summary.replace(`#SECTION${section.lbl}#`, section.summary);
    if (count < max_chars) summary = summary.replace(warn, '');
  });

  return summary;
};

const dvc_metrics_diff_report_md = data => {
  if (!data || !Object.keys(data).length) return 'No metrics available';

  const values = [];

  for (const path in data) {
    const output = data[path];
    for (const metric in output) {
      const new_ = numeral(output[metric].new).format(METRICS_FORMAT);
      const old = numeral(output[metric].old).format(METRICS_FORMAT);

      const arrow = output[metric].diff > 0 ? '+' : '';
      const color = output[metric].diff > 0 ? 'green' : 'red';
      const diff = output[metric].diff
        ? `<font color="${color}">${arrow}${numeral(output[metric].diff).format(
            METRICS_FORMAT
          )}</font>`
        : 'no available';

      values.push({ path, metric, old, new: new_, diff });
    }
  }

  const summary = `\n${json_2_mdtable(values)}`;

  return summary;
};

const others_report_md = others => {
  if (!others.length) return 'No other experiments available';

  const max = 5;

  let summary = `<details><summary>Experiments</summary>\n\n 
  Latest ${Math.min(others.length, max)} experiments in the branch:\n`;

  _.last(others, max).forEach(other => {
    if (other.link && other.label)
      summary += `[${other.label}](${other.link}) `;
    else summary += `${other.substr(0, 7)} `;
  });

  summary += '\n</details>';

  return summary;
};

const dvc_report_md = opts => {
  const { dvc_diff, dvc_metrics_diff, others = [] } = opts;
  const metrics_diff_md = dvc_metrics_diff_report_md(dvc_metrics_diff);
  const others_md = others_report_md(others);
  const diff_md = dvc_diff_report_md(
    dvc_diff,
    MAX_CHARS - (metrics_diff_md.length + others_md.length)
  );

  const summary = `### Data \n\n${diff_md} \n\n### Metrics \n\n ${metrics_diff_md} \n\n### Other experiments \n${others_md}`;

  return summary;
};

const md_to_html = markdown => `
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, minimal-ui">
		<title>GitHub Markdown CSS demo</title>
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
        </div>
    </body>
    <script src="showdown.min.js"></script>
    <script>
const text = \`${markdown}\`;

const converter = new showdown.Converter({ tables: true })
converter.setFlavor('github');

const html=converter.makeHtml(text);
document.getElementById("content").innerHTML = html; 
</script>
</html>
`;

exports.METRICS_FORMAT = METRICS_FORMAT;
exports.dvc_report_md = dvc_report_md;
exports.md_to_html = md_to_html;
