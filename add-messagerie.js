const fs = require('fs');
const path = require('path');
const baseDir = process.argv[2] || '.';
const files = [
  'src/app/pages/mes-livraisons/mes-livraisons.html',
  'src/app/pages/historique-livreur/historique-livreur.html',
  'src/app/pages/gains-livreur/gains-livreur.html',
  'src/app/pages/carte-livreur/carte-livreur.html',
  'src/app/pages/mon-moto/mon-moto.html',
  'src/app/pages/carburant/carburant.html',
  'src/app/pages/entretien/entretien.html',
  'src/app/pages/profil-livreur/profil-livreur.html'
];
const searchText = "naviguer('carte')";
const addText = '\n      <a class="nav-item" (click)="naviguer(\'messagerie\')"><span class="nav-icon">💬</span><span class="nav-label">Messagerie</span></a>';
files.forEach(f => {
  const fullPath = path.join(baseDir, f);
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes("naviguer('messagerie')")) { console.log('Deja:', f); return; }
    const idx = content.indexOf(searchText);
    if (idx === -1) { console.log('Carte non trouve:', f); return; }
    const endIdx = content.indexOf('</a>', idx) + 4;
    content = content.slice(0, endIdx) + addText + content.slice(endIdx);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('OK:', f);
  } catch(e) { console.log('Erreur:', f, e.message); }
});
console.log('Termine!');
