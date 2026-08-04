const fs = require('fs');

const travaux = [
  {
    f: 'src/app/pages/finances/finances.html',
    cible: '(click)="exporterExcel()">',
    avant: '<button class="btn-sm" (click)="exporterPDF()">Export PDF</button>\n        '
  },
  {
    f: 'src/app/pages/avis-clients/avis-clients.html',
    cible: '(click)="exporter()">',
    avant: '<button class="btn-sm" (click)="exporterExcel()">Export Excel</button>\n        '
  },
  {
    f: 'src/app/pages/historique-commandes/historique-commandes.html',
    cible: '(click)="exporterPDF()">',
    apres: true,
    ajout: '\n        <button class="btn-sm" (click)="exporterExcel()">Export Excel</button>'
  },
  {
    f: 'src/app/pages/historique-livreur/historique-livreur.html',
    cible: '(click)="exporterCSV()">',
    avant: '<button class="btn-export" (click)="exporterPDF()">Export PDF</button>\n          '
  }
];

travaux.forEach(t => {
  try {
    let c = fs.readFileSync(t.f, 'utf8');
    const idx = c.indexOf(t.cible);
    if (idx === -1) { console.log('CIBLE INTROUVABLE: ' + t.f); return; }

    if (t.apres) {
      const fin = c.indexOf('</button>', idx) + 9;
      c = c.slice(0, fin) + t.ajout + c.slice(fin);
    } else {
      const debutBouton = c.lastIndexOf('<button', idx);
      c = c.slice(0, debutBouton) + t.avant + c.slice(debutBouton);
    }
    fs.writeFileSync(t.f, c, 'utf8');
    console.log('OK ' + t.f);
  } catch (e) { console.log('ERREUR ' + t.f + ' : ' + e.message); }
});
