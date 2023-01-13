const WATERMARK_IMAGE = 'https://cml.dev/watermark.png';

class Watermark {
  constructor(opts = {}) {
    const { label = '', workflow, run, sha = false } = opts;
    // Replace {workflow} and {run} placeholders in label with actual values.
    this.label = label.replace('{workflow}', workflow).replace('{run}', run);

    this.sha = sha;
  }

  // Appends the watermark (in markdown) to the report.
  appendTo(report) {
    return `${report}\n\n${this.toString()}`;
  }

  // Returns whether the watermark is present in the specified text.
  // When checking for presence, the commit sha in the watermark is ignored.
  isIn(text) {
    const title = escapeRegExp(this.title);
    const url = escapeRegExp(this.url({ sha: false }));
    const pattern = `!\\[\\]\\(${url}#[0-9a-fA-F]+ "${title}"\\)`;
    const re = new RegExp(pattern);
    return re.test(text);
  }

  // String representation of the watermark.
  toString() {
    // Replace {workflow} and {run} placeholders in label with actual values.
    return `![](${this.url()} "${this.title}")`;
  }

  get title() {
    let title = `CML watermark ${this.label}`.trim();
    // Github appears to escape underscores and asterisks in markdown content.
    // Without escaping them, the watermark content in comments retrieved
    // from github will not match the input.
    const patterns = [
      [/_/g, '\\_'], // underscore
      [/\*/g, '\\*'], // asterisk
      [/\[/g, '\\['], // opening square bracket
      [/</g, '\\<'] // opening angle bracket
    ];
    title = patterns.reduce(
      (label, pattern) => label.replace(pattern[0], pattern[1]),
      title
    );
    return title;
  }

  url(opts = {}) {
    const { sha = this.sha } = opts;
    const watermarkUrl = new URL(WATERMARK_IMAGE);
    if (sha) {
      watermarkUrl.hash = sha;
    }
    return watermarkUrl.toString();
  }
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { Watermark };
