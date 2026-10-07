/**
 * Checks that docs/code-guide.html still matches the code. Run by the workflow on every push and pull request.
 *
 *  1. Live excerpts: <figure class="excerpt" data-file="…" data-start="…">
 *     The file must exist, and the data-start text must be in exactly one line of it
 *     (zero means the code was renamed; two would show the wrong excerpt).
 *  2. Folder tree (chapter "Folder structure"): every data-path / data-repo-path must exist,
 *     and every JavaScript file in the repo must appear in the tree.
 *  3. Feature flow diagrams (between FLOWS:START and FLOWS:END): every lane "file" must exist,
 *     and every function name written as name() (no space before the bracket) in a label must appear in the code.
 *
 * Run it locally:  node .github/scripts/check-code-guide.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const GUIDE = 'docs/code-guide.html';
const html = readFileSync(GUIDE, 'utf8');
const problems = [];

const decode = text => text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const attribute = (tag, name) => {
    const match = tag.match(new RegExp(`${name}="([^"]*)"`));
    return match ? decode(match[1]) : null;
};

/** Every file under a folder, as repo-relative paths. */
function listFiles(folder) {
    return readdirSync(folder).flatMap(name => {
        const path = join(folder, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    });
}

// ── 1. Excerpts ──────────────────────────────────────────────────────────────
const excerptTags = html.match(/<figure class="excerpt"[^>]*>/g) || [];
for (const tag of excerptTags) {
    const file = attribute(tag, 'data-file');
    const start = attribute(tag, 'data-start');
    if (!file || !existsSync(file)) { problems.push(`excerpt: ${file} not found`); continue; }
    if (!start) continue; // whole-file excerpt
    const matchingLines = readFileSync(file, 'utf8').split('\n').filter(line => line.includes(start)).length;
    if (matchingLines !== 1) problems.push(`excerpt: ${file}: "${start.trim()}" found in ${matchingLines} lines (expected exactly 1)`);
}

// ── 2. Folder tree ───────────────────────────────────────────────────────────
const treePaths = [...html.matchAll(/data-(?:repo-)?path="([^"]+)"/g)].map(match => decode(match[1]));
treePaths.filter(path => !existsSync(path)).forEach(path => problems.push(`folder tree: ${path} does not exist`));

const repoJsFiles = [...listFiles('src'), 'Accurex-DynamicFormRenderer.js', 'service-worker.js']
    .filter(path => path.endsWith('.js'))
    .map(path => path.split('\\').join('/'));
repoJsFiles.filter(path => !treePaths.includes(path))
    .forEach(path => problems.push(`folder tree: ${path} exists but is not listed in the "Folder structure" chapter`));

// ── 3. Feature flows ─────────────────────────────────────────────────────────
const flowsBlock = (html.match(/FLOWS:START([\s\S]*?)FLOWS:END/) || [])[1];
if (!flowsBlock) {
    problems.push('feature flows: FLOWS:START / FLOWS:END markers not found');
} else {
    for (const [, file] of flowsBlock.matchAll(/\bfile:\s*'([^']+)'/g)) {
        if (!existsSync(file)) problems.push(`feature flows: lane file ${file} does not exist`);
    }

    const codeCorpus = [...repoJsFiles, 'sample.html'].map(path => readFileSync(path, 'utf8')).join('\n');
    const labels = [...flowsBlock.matchAll(/\b(?:text|label|note):\s*(['"])((?:\\.|(?!\1).)*)\1/g)].map(match => match[2]);
    const names = new Set(labels.flatMap(label => [...label.matchAll(/([A-Za-z_$][\w$]*)\(/g)].map(match => match[1])));
    for (const name of names) {
        if (!new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(codeCorpus)) {
            problems.push(`feature flows: ${name}() is named in a diagram but no longer appears in the code`);
        }
    }
}

if (problems.length > 0) {
    console.error(`${GUIDE} no longer matches the code (${problems.length} problem(s)):`);
    problems.forEach(problem => console.error('  - ' + problem));
    process.exit(1);
}
console.log(`${GUIDE}: ${excerptTags.length} excerpts, ${treePaths.length} tree entries and the feature flows all match the code.`);
