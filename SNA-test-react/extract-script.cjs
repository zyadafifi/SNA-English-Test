const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'read and select.html'), 'utf8');
const idx = html.indexOf('</script>', html.indexOf('skills-config'));
const start = html.indexOf('<script>', idx) + '<script>'.length;
const end = html.indexOf('</script>', start);
const script = html.slice(start, end).trim();
fs.writeFileSync(path.join(__dirname, 'src', 'legacy', 'read-and-select.legacy.raw.js'), script, 'utf8');
console.log('Extracted script length', script.length);
