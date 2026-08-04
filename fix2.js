const fs = require('fs');

// historique-commandes : ajouter Excel apres le bouton PDF
let f1 = 'src/app/pages/historique-commandes/historique-commandes.html';
let c1 = fs.readFileSync(f1, 'utf8');
if (c1.indexOf('exporterExcel') === -1) {
  const i = c1.indexOf('(click)="exporterPDF()"');
  const fin = c1.indexOf('</button>', i) + 9;
  c1 = c1.slice(0, fin) +
       '\n        <button class="btn-sm" (click)="exporterExcel()">Export Excel</button>' +
       c1.slice(fin);
  fs.writeFileSync(f1, c1, 'utf8');
  console.log('OK historique-commandes');
} else console.log('deja fait historique-commandes');

// historique-livreur : ajouter PDF avant le bouton CSV
let f2 = 'src/app/pages/historique-livreur/historique-livreur.html';
let c2 = fs.readFileSync(f2, 'utf8');
if (c2.indexOf('exporterPDF') === -1) {
  const i = c2.indexOf('(click)="exporterCSV()"');
  const debut = c2.lastIndexOf('<button', i);
  c2 = c2.slice(0, debut) +
       '<button class="btn-export" (click)="exporterPDF()" *ngIf="livraisonsFiltrees.length > 0">Export PDF</button>\n        ' +
       c2.slice(debut);
  fs.writeFileSync(f2, c2, 'utf8');
  console.log('OK historique-livreur');
} else console.log('deja fait historique-livreur');
