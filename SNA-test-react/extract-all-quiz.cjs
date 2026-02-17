const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const quizzes = [
  { html: 'read and complete.html', css: 'read-and-complete.css', raw: 'read-and-complete.legacy.raw.js', skill: 'Read and Complete', json: 'read and complete data.json' },
  { html: 'listen and type.html', css: 'listen-and-type.css', raw: 'listen-and-type.legacy.raw.js', skill: 'Listen and Type', json: 'listen and type data.json' },
  { html: 'write about the photo.html', css: 'write-about-the-photo.css', raw: 'write-about-the-photo.legacy.raw.js', skill: 'Write About the Photo', json: 'write about photo data.json' },
  { html: 'speak about the photo.html', css: 'speak-about-the-photo.css', raw: 'speak-about-the-photo.legacy.raw.js', skill: 'Speak About the Photo', json: 'speak about the photo data.json' },
  { html: 'read then speak.html', css: 'read-then-speak.css', raw: 'read-then-speak.legacy.raw.js', skill: 'Read, Then Speak', json: 'read then speak data.json' },
  { html: 'interactive reading.html', css: 'interactive-reading.css', raw: 'interactive-reading.legacy.raw.js', skill: 'Interactive Reading', json: 'interactive reading data.json' },
  { html: 'interactive listening.html', css: 'interactive-listening.css', raw: 'interactive-listening.legacy.raw.js', skill: 'Interactive Listening', json: 'interactive listening data.json' },
  { html: 'writing sample.html', css: 'writing-sample.css', raw: 'writing-sample.legacy.raw.js', skill: 'Writing Sample', json: 'writing sample data.json' },
  { html: 'speaking sample.html', css: 'speaking-sample.css', raw: 'speaking-sample.legacy.raw.js', skill: 'Speaking Sample', json: 'speaking sample data.json' },
];

for (const q of quizzes) {
  const htmlPath = path.join(root, q.html);
  if (!fs.existsSync(htmlPath)) { console.log('Skip (no file):', q.html); continue; }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const styleStart = html.indexOf('<style>') + 7;
  const styleEnd = html.indexOf('</style>');
  let css = html.slice(styleStart, styleEnd);
  css = css.split('\n').map(l => l.replace(/^      /, '')).join('\n').trim();
  fs.writeFileSync(path.join(__dirname, 'src', 'pages', 'styles', q.css), css, 'utf8');
  const idx = html.indexOf('</script>', html.indexOf('skills-config'));
  const start = html.indexOf('<script>', idx) + 8;
  const end = html.indexOf('</script>', start);
  const script = html.slice(start, end).trim();
  fs.writeFileSync(path.join(__dirname, 'src', 'legacy', q.raw), script, 'utf8');
  console.log('Extracted:', q.html, '->', q.css, q.raw);
}
