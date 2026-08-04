const fs = require('fs');
const path = require('path');
const baseDir = process.argv[2] || '.';
const files = [
  'src/app/pages/accueil/accueil.ts',
  'src/app/pages/menu/menu.ts',
  'src/app/pages/profil-client/profil-client.ts',
  'src/app/pages/historique-commandes/historique-commandes.ts'
];
files.forEach(f => {
  const fullPath = path.join(baseDir, f);
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('utilisateur =')) { console.log('Deja:', f); return; }
    const idx = content.indexOf('export class');
    const endIdx = content.indexOf('{', idx) + 1;
    const prop = '\n  utilisateur: any = null;\n';
    content = content.slice(0, endIdx) + prop + content.slice(endIdx);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('OK:', f);
  } catch(e) { console.log('Erreur:', f, e.message); }
});
console.log('Termine!');
