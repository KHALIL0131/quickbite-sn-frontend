import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-finances',
  imports: [CommonModule, FormsModule],
  templateUrl: './finances.html',
  styleUrl: './finances.scss'
})
export class Finances implements OnInit, AfterViewInit {

  admin: any = null;
  sidebarOpen = false;

  // DONNÉES
  transactions: any[] = [];
  transactionsFiltrees: any[] = [];
  loading = true;

  // SOLDES
  soldes = {
    disponible: 0,
    enAttente: 0,
    totalRetire: 0
  };

  // FILTRES
  searchQuery = '';
  filtreType = '';
  filtrePaiement = '';

  // PAGINATION
  page = 1;
  parPage = 10;

  private apiUrl = environment.apiUrl;
  private revenueChart: any = null;
  private payChart: any = null;

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
    setTimeout(() => this.initGraphiques(), 800);
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

    fetch(`${this.apiUrl}/commandes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const commandes = data.data;

        // Générer transactions depuis commandes
        this.transactions = commandes.map((c: any, i: number) => {
          const commission = Math.round((parseFloat(c.montant_total) || 0) * 0.08);
          const net = (parseFloat(c.montant_total) || 0) - commission;
          const type = c.statut === 'annulee' ? 'sortie' :
                       c.statut === 'livree' ? 'entree' : 'attente';
          return {
            id: `TX-${c.numero || String(i).padStart(5, '0')}`,
            description: `Commande #${c.numero} · ${c.client_nom}`,
            paiement: c.mode_paiement || 'Wave',
            montant_brut: parseFloat(c.montant_total) || 0,
            commission: commission,
            net: net,
            type: type,
            date: c.created_at
          };
        });

        // Calculer soldes
        const livrees = commandes.filter((c: any) => c.statut === 'livree');
        const enCours = commandes.filter((c: any) =>
          ['nouvelle', 'preparation', 'en_livraison'].includes(c.statut));

        this.soldes.disponible = livrees.reduce((s: number, c: any) =>
          s + Math.round((parseFloat(c.montant_total) || 0) * 0.92), 0);
        this.soldes.enAttente = enCours.reduce((s: number, c: any) =>
          s + (parseFloat(c.montant_total) || 0), 0);
        this.soldes.totalRetire = 0;

        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    })
    .catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  filtrer() {
    let result = [...this.transactions];

    if (this.filtreType) {
      result = result.filter(t => t.type === this.filtreType);
    }

    if (this.filtrePaiement) {
      result = result.filter(t =>
        t.paiement?.toLowerCase().includes(this.filtrePaiement.toLowerCase()));
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.id?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }

    this.transactionsFiltrees = result;
    this.page = 1;
    this.cdr.detectChanges();
  }

  get transactionsPaginees() {
    const debut = (this.page - 1) * this.parPage;
    return this.transactionsFiltrees.slice(debut, debut + this.parPage);
  }

  get totalPages() {
    return Math.ceil(this.transactionsFiltrees.length / this.parPage);
  }

  get pages() {
    return Array.from({ length: Math.min(this.totalPages, 5) }, (_, i) => i + 1);
  }

  changerPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.cdr.detectChanges();
    }
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL
  // ══════════════════════════════════
  private construireOptionsFinances(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const mt = (v: any) => this.exportService.montant(v);
    const dt = (v: any) => this.exportService.date(v);

    const source = this.transactionsFiltrees.length > 0
      ? this.transactionsFiltrees
      : this.transactions;

    const entrees = source.filter(t => t.type === 'entree');
    const volumeBrut = entrees.reduce((s, t) => s + (parseFloat(t.montant_brut) || 0), 0);
    const totalCommissions = entrees.reduce((s, t) => s + (parseFloat(t.commission) || 0), 0);
    const totalNet = entrees.reduce((s, t) => s + (parseFloat(t.net) || 0), 0);

    return {
      titre: 'Rapport financier',
      sousTitre: `Situation au ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `quickbite-finances-${dateFichier}`,
      orientation: 'landscape',
      donnees: source,
      colonnes: [
        { cle: 'id', titre: 'Référence', largeur: 22 },
        { cle: 'description', titre: 'Description', largeur: 36 },
        { cle: 'montant_brut', titre: 'Montant brut', largeur: 17, format: mt },
        { cle: 'commission', titre: 'Commission 8%', largeur: 17, format: mt },
        { cle: 'net', titre: 'Net restaurant', largeur: 17, format: mt },
        { cle: 'type', titre: 'Type', largeur: 14,
          format: (v: any) => this.getTypeLabel(v) },
        { cle: 'paiement', titre: 'Paiement', largeur: 15 },
        { cle: 'date', titre: 'Date', largeur: 20, format: dt }
      ],
      resume: [
        { label: 'Transactions', valeur: String(source.length) },
        { label: 'Volume brut', valeur: mt(volumeBrut) },
        { label: 'Commissions', valeur: mt(totalCommissions) },
        { label: 'Net restaurants', valeur: mt(totalNet) },
        { label: 'Solde disponible', valeur: mt(this.soldes.disponible) },
        { label: 'En attente', valeur: mt(this.soldes.enAttente) }
      ]
    };
  }

  exporterPDF() {
    if (this.transactions.length === 0) {
      alert('Aucune transaction à exporter');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsFinances());
  }

  exporterExcel() {
    if (this.transactions.length === 0) {
      alert('Aucune transaction à exporter');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsFinances());
  }

  exporterCSV() {
    if (this.transactions.length === 0) {
      alert('Aucune transaction à exporter');
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsFinances());
  }

  getPaiementIcon(paiement: string): string {
    const map: any = {
      'wave': '📱',
      'orange_money': '🟠',
      'carte': '💳',
      'especes': '💵'
    };
    return map[paiement?.toLowerCase()] || '💰';
  }

  getTypeClass(type: string): string {
    const map: any = {
      'entree': 'tx-in',
      'sortie': 'tx-out',
      'attente': 'tx-pending'
    };
    return map[type] || 'tx-pending';
  }

  getTypeLabel(type: string): string {
    const map: any = {
      'entree': 'Entrée',
      'sortie': 'Sortie',
      'attente': 'En attente'
    };
    return map[type] || type;
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  initGraphiques() {
    const Chart = (window as any).Chart;
    if (!Chart) return;

    const gridColor = 'rgba(34,168,106,0.06)';
    const tickColor = '#6B8F77';

    // Graphique revenus
    const revenueEl = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (revenueEl) {
      if (this.revenueChart) this.revenueChart.destroy();

      const entrees = this.transactions.filter(t => t.type === 'entree');
      const labels = entrees.slice(0, 10).map(t => t.id);
      const revenus = entrees.slice(0, 10).map(t => t.montant_brut / 1000);
      const commissions = entrees.slice(0, 10).map(t => t.commission / 1000);

      this.revenueChart = new Chart(revenueEl, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['Aucune donnée'],
          datasets: [
            {
              label: 'Revenus bruts (K FCFA)',
              data: revenus.length > 0 ? revenus : [0],
              backgroundColor: 'rgba(34,168,106,0.6)',
              borderRadius: 5
            },
            {
              label: 'Commissions (K FCFA)',
              data: commissions.length > 0 ? commissions : [0],
              backgroundColor: 'rgba(231,76,60,0.5)',
              borderRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { labels: { color: tickColor, font: { size: 11 } } },
            title: {
              display: entrees.length === 0,
              text: 'Aucune transaction — passez des commandes',
              color: tickColor,
              font: { size: 12 }
            }
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } }
          }
        }
      });
    }

    // Graphique paiements
    const payEl = document.getElementById('payChart') as HTMLCanvasElement;
    if (payEl) {
      if (this.payChart) this.payChart.destroy();

      const paiements: any = { wave: 0, orange_money: 0, carte: 0, especes: 0 };
      this.transactions.forEach(t => {
        const k = t.paiement?.toLowerCase() || 'wave';
        if (paiements[k] !== undefined) paiements[k]++;
      });

      const total = Object.values(paiements).reduce((a: any, b: any) => a + b, 0) as number;

      this.payChart = new Chart(payEl, {
        type: 'doughnut',
        data: {
          labels: ['Wave', 'Orange Money', 'Carte', 'Espèces'],
          datasets: [{
            data: total > 0 ?
              [paiements.wave, paiements.orange_money, paiements.carte, paiements.especes] :
              [1, 0, 0, 0],
            backgroundColor: ['#22A86A', '#F5A623', '#2563EB', '#FFD700'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: tickColor, font: { size: 11 }, boxWidth: 12, padding: 10 }
            }
          }
        }
      });
    }
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