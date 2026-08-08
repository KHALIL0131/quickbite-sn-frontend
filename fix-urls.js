const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, 'src', 'app');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, filelist);
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
      filelist.push(filepath);
    }
  }
  return filelist;
}

const files = walk(projectRoot);
let modifiedCount = 0;

for (const filepath of files) {
  let content = fs.readFileSync(filepath, 'utf8');
  const original = content;

  content = content.replace(/'http:\/\/localhost:3000\/api\/auth'/g, '`${environment.apiUrl}/auth`');
  content = content.replace(/'http:\/\/localhost:3000\/api'/g, 'environment.apiUrl');
  content = content.replace(/`http:\/\/localhost:3000\/uploads\//g, '`${environment.serverUrl}/uploads/');
  content = content.replace(/io\(\s*'http:\/\/localhost:3000'/g, 'io(environment.socketUrl');

  if (content !== original) {
    if (!/import\s*{\s*environment\s*}\s*from/.test(content)) {
      const relDir = path.relative(path.dirname(filepath), path.join(__dirname, 'src', 'environments'));
      let importPath = relDir.split(path.sep).join('/') + '/environment';
      if (!importPath.startsWith('.')) importPath = './' + importPath;
      content = `import { environment } from '${importPath}';\n` + content;
    }
    fs.writeFileSync(filepath, content, 'utf8');
    modifiedCount++;
    console.log('Modifié:', path.relative(__dirname, filepath));
  }
}

console.log(`\n✅ ${modifiedCount} fichiers modifiés.`);