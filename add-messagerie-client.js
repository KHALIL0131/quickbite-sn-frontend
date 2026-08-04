const fs = require('fs');
const path = require('path');
const baseDir = process.argv[2] || '.';
const files = [
  'src/app/pages/accueil/accueil.html',
  'src/app/pages/menu/menu.html',
  'src/app/pages/panier/panier.html',
  'src/app/pages/profil-client/profil-client.html',
  'src/app/pages/historique-commandes/historique-commandes.html'
];
const addText = '\n      <button class="nav-msg-btn" *ngIf="utilisateur" (click)="goToMessagerie()">💬</button>';
files.forEach(f => {
  const fullPath = path.join(baseDir, f);
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('goToMessagerie')) { console.log('Deja:', f); return; }
    const idx = content.indexOf('nav-right');
    if (idx === -1) { console.log('nav-right non trouve:', f); return; }
    const endIdx = content.indexOf('>', idx) + 1;
    content = content.slice(0, endIdx) + addText + content.slice(endIdx);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('OK:', f);
  } catch(e) { console.log('Erreur:', f, e.message); }
});
console.log('Termine!');
