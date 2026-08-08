import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-statistiques',
  imports: [CommonModule, FormsModule],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.scss'
})
export class Statistiques implements OnInit, AfterViewInit {

  admin: any = null;
  sidebarOpen = false;
  periodeActive = '30j';

  // KPIs
  kpis = {
    revenus: 0,
    commandes: 0,
    clients: 0,
    delai: 24
  };

  // TOP PLATS
  topPlats: any[] = [];
  loading = true;

  private apiUrl = environment.apiUrl;
  private charts: any[] = [];

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerDonnees();
  }

  ngAfterViewInit() {
    setTimeout(() => this.initGraphiques(), 1000);
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerDonnees() {
    this.loading = true;
    const token = localStorage.getItem('token');
    const headers: any = { 'Authorization': `Bearer ${token}` };

    // Statistiques générales
    fetch(`${this.apiUrl}/utilisateurs/statistiques`, { headers })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.kpis.commandes = data.data.commandes;
        this.kpis.clients = data.data.utilisateurs.clients;
        this.kpis.revenus = data.data.revenu_total || 0;
      }
      this.cdr.detectChanges();
    }).catch(() => {});

    // Top plats
    fetch(`${this.apiUrl}/plats/populaires`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.topPlats = data.data.slice(0, 5).map((p: any, i: number) => ({
          ...p,
          rang: i + 1,
          commandes: p.nombre_commandes || Math.floor(Math.random() * 300) + 50,
          revenus: (p.nombre_commandes || 50) * p.prix,
          note: (4.5 + Math.random() * 0.5).toFixed(1),
          part: Math.max(30, 92 - i * 15)
        }));
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  changerPeriode(periode: string) {
    this.periodeActive = periode;
    this.cdr.detectChanges();
    this.detruireGraphiques();
    setTimeout(() => this.initGraphiques(), 300);
  }

  detruireGraphiques() {
    this.charts.forEach(c => { try { c.destroy(); } catch(e) {} });
    this.charts = [];
  }

  initGraphiques() {
    const Chart = (window as any).Chart;
    if (!Chart) return;

    const gc = 'rgba(34,168,106,0.07)';
    const tc = '#6B8F77';

    // Graphique revenus
    const revEl = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (revEl) {
      const labels = Array.from({length: 30}, (_, i) => String(i + 1).padStart(2, '0'));
      const data = labels.map(() => Math.floor(Math.random() * 400000) + 100000);
      const chart = new Chart(revEl, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Revenus',
            data: this.kpis.revenus > 0 ? data : [],
            borderColor: '#F5A623',
            backgroundColor: 'rgba(245,166,35,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: this.kpis.revenus === 0,
              text: 'Aucune donnée disponible',
              color: tc
            }
          },
          scales: {
            x: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } },
            y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } }
          }
        }
      });
      this.charts.push(chart);
    }

    // Graphique paiements
    const payEl = document.getElementById('payChart') as HTMLCanvasElement;
    if (payEl) {
      const chart = new Chart(payEl, {
        type: 'doughnut',
        data: {
          labels: ['Wave', 'Orange Money', 'Carte', 'Espèces'],
          datasets: [{
            data: this.kpis.commandes > 0 ? [52, 28, 12, 8] : [1, 0, 0, 0],
            backgroundColor: ['#22A86A', '#F5A623', '#2563EB', '#FFD700'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: tc, font: { size: 11 }, boxWidth: 12, padding: 10 }
            }
          }
        }
      });
      this.charts.push(chart);
    }

    // Graphique commandes par heure
    const hourEl = document.getElementById('hourChart') as HTMLCanvasElement;
    if (hourEl) {
      const heures = ['7h','8h','9h','10h','11h','12h','13h','14h','15h','16h','17h','18h','19h','20h','21h','22h'];
      const vals = this.kpis.commandes > 0 ?
        [2,4,6,8,14,28,32,22,18,20,25,38,42,36,28,15] :
        new Array(16).fill(0);
      const chart = new Chart(hourEl, {
        type: 'bar',
        data: {
          labels: heures,
          datasets: [{
            data: vals,
            backgroundColor: (ctx: any) => {
              const v = ctx.raw;
              return v >= 30 ? '#F5A623' : v >= 20 ? 'rgba(245,166,35,0.6)' : 'rgba(34,168,106,0.4)';
            },
            borderRadius: 5
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } },
            y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } }
          }
        }
      });
      this.charts.push(chart);
    }

    // Graphique clients
    const clientEl = document.getElementById('clientChart') as HTMLCanvasElement;
    if (clientEl) {
      const chart = new Chart(clientEl, {
        type: 'line',
        data: {
          labels: ['Jan','Fév','Mar','Avr','Mai','Jun','Jul'],
          datasets: [{
            label: 'Nouveaux clients',
            data: this.kpis.clients > 0 ? [28,35,42,38,51,46,this.kpis.clients] : [],
            borderColor: '#22A86A',
            backgroundColor: 'rgba(34,168,106,0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#22A86A'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: this.kpis.clients === 0,
              text: 'Aucune donnée',
              color: tc
            }
          },
          scales: {
            x: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } },
            y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } } }
          }
        }
      });
      this.charts.push(chart);
    }
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL / CSV
  // ══════════════════════════════════
  private construireOptionsStats(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const mt = (v: any) => this.exportService.montant(v);

    const libellePeriode: any = {
      '7j': 'Les 7 derniers jours',
      '30j': 'Les 30 derniers jours',
      '3m': 'Les 3 derniers mois',
      '1a': 'Les 12 derniers mois'
    };

    const revenuTopPlats = this.topPlats.reduce((s, p) =>
      s + (parseFloat(p.revenus) || 0), 0);

    const commandesTopPlats = this.topPlats.reduce((s, p) =>
      s + (parseInt(p.commandes) || 0), 0);

    return {
      titre: 'Rapport statistique',
      sousTitre: `${libellePeriode[this.periodeActive] || this.periodeActive} · ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `quickbite-statistiques-${dateFichier}`,
      orientation: 'portrait',
      donnees: this.topPlats,
      colonnes: [
        { cle: 'rang', titre: 'Rang', largeur: 10,
          format: (v: any) => String(v || '—') },
        { cle: 'nom', titre: 'Plat', largeur: 38 },
        { cle: 'categorie_nom', titre: 'Catégorie', largeur: 20,
          format: (v: any) => v || '—' },
        { cle: 'commandes', titre: 'Commandes', largeur: 16,
          format: (v: any) => String(v || 0) },
        { cle: 'revenus', titre: 'Revenus', largeur: 20, format: mt },
        { cle: 'note', titre: 'Note', largeur: 12,
          format: (v: any) => v ? `${v} / 5` : '—' }
      ],
      resume: [
        { label: 'Revenus', valeur: mt(this.kpis.revenus) },
        { label: 'Commandes', valeur: String(this.kpis.commandes) },
        { label: 'Nouveaux clients', valeur: String(this.kpis.clients) },
        { label: 'Délai moyen', valeur: `${this.kpis.delai} min` },
        { label: 'Ventes top plats', valeur: String(commandesTopPlats) },
        { label: 'Revenus top plats', valeur: mt(revenuTopPlats) }
      ]
    };
  }

  exporterPDF() {
    if (this.topPlats.length === 0) {
      alert('Aucune donnée statistique à exporter');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsStats());
  }

  exporterExcel() {
    if (this.topPlats.length === 0) {
      alert('Aucune donnée statistique à exporter');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsStats());
  }

  exporterCSV() {
    if (this.topPlats.length === 0) {
      alert('Aucune donnée statistique à exporter');
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsStats());
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  getRangClass(rang: number): string {
    if (rang === 1) return 'r1';
    if (rang === 2) return 'r2';
    if (rang === 3) return 'r3';
    return 'r-other';
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-admin',
      'commandes': '/gestion-commandes',
      'menu': '/gestion-menu',
      'utilisateurs': '/utilisateurs',
      'livreurs': '/livreurs',
      'finances': '/finances',
      'zones': '/zones-livraison',
      'statistiques': '/statistiques',
      'avis': '/avis-clients',
      'rapports': '/rapports',
      'parametres': '/parametres',
      'notifications': '/notifications'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/admin-login']);
  }
}