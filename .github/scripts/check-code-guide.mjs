/**
 * Checks that every live code excerpt in docs/code-guide.html still points at real code.
 *
 * Each excerpt looks like:  <figure class="excerpt" data-file="src/x.js" data-start="    refresh() {">
 * The check fails when the file no longer exists, or when the data-start text is not found in
 * exactly one line of that file (zero means the code was renamed; two would show the wrong excerpt).
 *
 * Run it locally:  node .github/scripts/check-code-guide.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const GUIDE = 'docs/code-guide.html';
const html = readFileSync(GUIDE, 'utf8');

const decode = text => text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const attribute = (tag, name) => {
    const match = tag.match(new RegExp(`${name}="([^"]*)"`));
    return match ? decode(match[1]) : null;
};

const problems = [];
const excerptTags = html.match(/<figure class="excerpt"[^>]*>/g) || [];

for (const tag of excerptTags) {
    const file = attribute(tag, 'data-file');
    const start = attribute(tag, 'data-start');

    if (!file || !existsSync(file)) {
        problems.push(`${file}: file not found`);
        continue;
    }
    if (!start) continue; // whole-file excerpt

    const matchingLines = readFileSync(file, 'utf8').split('\n').filter(line => line.includes(start)).length;
    if (matchingLines !== 1) {
        problems.push(`${file}: "${start.trim()}" found in ${matchingLines} lines (expected exactly 1)`);
    }
}

if (problems.length > 0) {
    console.error(`${GUIDE}: ${problems.length} excerpt(s) no longer match the code. Update the data-start text:`);
    problems.forEach(problem => console.error('  - ' + problem));
    process.exit(1);
}
console.log(`${GUIDE}: all ${excerptTags.length} excerpts match the code.`);
