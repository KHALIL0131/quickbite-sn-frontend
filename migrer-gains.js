const fs = require('fs');
const f = 'src/app/pages/gains-livreur/gains-livreur.ts';
let c = fs.readFileSync(f, 'utf8');

if (c.indexOf('api.service') === -1) {
  c = c.replace(
    "import { Router } from '@angular/router';",
    "import { Router } from '@angular/router';\nimport { ApiService } from '../../services/api.service';"
  );
}

c = c.replace(
  'constructor(private router: Router, private cdr: ChangeDetectorRef) {}',
  'constructor(\n    private router: Router,\n    private cdr: ChangeDetectorRef,\n    private api: ApiService\n  ) {}'
);

const nouvelle = [
"chargerGains() {",
"    this.loading = true;",
"",
"    this.api.get<any>('livreur/gains').subscribe({",
"      next: (data) => {",
"        if (data.success && data.data) {",
"          this.gains = {",
"            total: data.data.total || 0,",
"            jour: data.data.jour || 0,",
"            semaine: data.data.semaine || 0,",
"            mois: data.data.mois || 0,",
"            parJour: data.data.parJour || [],",
"            historique: data.data.historique || []",
"          };",
"        }",
"        this.loading = false;",
"        this.cdr.detectChanges();",
"      },",
"      error: () => {",
"        this.gains = {",
"          total: 0, jour: 0, semaine: 0, mois: 0,",
"          parJour: [], historique: []",
"        };",
"        this.loading = false;",
"        this.cdr.detectChanges();",
"      }",
"    });",
"  }"
].join('\n');

const re = /chargerGains\(\) \{[\s\S]*?\n  \}\n\n  getBarHeight/;
if (re.test(c)) {
  c = c.replace(re, nouvelle + '\n\n  getBarHeight');
  fs.writeFileSync(f, c, 'utf8');
  console.log('OK - gains-livreur.ts migre');
} else {
  console.log('ATTENTION - methode chargerGains non trouvee');
}
