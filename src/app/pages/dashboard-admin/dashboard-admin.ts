import { Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-dashboard-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-admin.html',
  styleUrl: './dashboard-admin.scss'
})
export class DashboardAdmin implements OnInit, AfterViewInit {

  admin: any = null;
  dateAujourdhui = '';
  navActive = 'dashboard';
  sidebarOpen = false;

  kpis = { revenus: 0, commandes: 0, clients: 0, note: 4.8 };

  commandes: any[] = [];
  commandesFiltrees: any[] = [];
  searchCommande = '';
  filtreStatut = '';
  filtrePaiement = '';
  loading = true;
  topPlats: any[] = [];
  activites: any[] = [];

  private apiUrl = 'http://localhost:3000/api';
  private revenueChart: any = null;
  private catChart: any = null;
  private donneesChargees = false;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.setDate();
    this.chargerDonnees();
  }

  ngAfterViewInit() {}

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  setDate() {
    const now = new Date();
    this.dateAujourdhui = now.toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  chargerDonnees() {
    this.loading = true;
    const token = localStorage.getItem('token');
    const headers: any = { 'Authorization': `Bearer ${token}` };

    // Charger commandes
    fetch(`${this.apiUrl}/commandes`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.commandes = data.data || [];
          const revenus = this.commandes
            .filter(c => c.statut === 'livree')
            .reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0);
          this.kpis.revenus = revenus;
          this.kpis.commandes = this.commandes.length;
          this.filtrerCommandes();
          this.genererActivites();
          this.mettreAJourGraphiques();
        }
        this.loading = false;
        this.cdr.detectChanges();
      }).catch(() => { this.loading = false; this.cdr.detectChanges(); });

    // Charger top plats
    fetch(`${this.apiUrl}/plats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const tous = data.data || [];
          this.topPlats = tous
            .sort((a: any, b: any) => (b.nombre_commandes || 0) - (a.nombre_commandes || 0))
            .slice(0, 5);
          if (this.topPlats.length === 0) this.topPlats = tous.slice(0, 5);
        }
        this.cdr.detectChanges();
      }).catch(() => {});

    // Charger clients
    fetch(`${this.apiUrl}/utilisateurs`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const clients = (data.data || []).filter((u: any) => u.role === 'client');
          this.kpis.clients = clients.length;
          this.cdr.detectChanges();
        }
      }).catch(() => {});
  }

  genererActivites() {
    this.activites = this.commandes.slice(0, 8).map(c => ({
      texte: `Commande #${c.numero} · ${c.client_prenom || ''} ${c.client_nom || ''}`,
      statut: c.statut,
      label: this.getStatutLabel(c.statut)
    }));
  }

  filtrerCommandes() {
    let result = [...this.commandes];
    if (this.searchCommande) {
      const q = this.searchCommande.toLowerCase();
      result = result.filter(c =>
        c.numero?.toLowerCase().includes(q) ||
        c.client_nom?.toLowerCase().includes(q) ||
        c.client_prenom?.toLowerCase().includes(q)
      );
    }
    if (this.filtreStatut) result = result.filter(c => c.statut === this.filtreStatut);
    if (this.filtrePaiement) result = result.filter(c => c.mode_paiement === this.filtrePaiement);
    this.commandesFiltrees = result;
    this.cdr.detectChanges();
  }

  // ══ GRAPHIQUES ══
  mettreAJourGraphiques() {
    setTimeout(() => {
      const Chart = (window as any).Chart;
      if (!Chart) return;

      // Détruire anciens graphiques
      if (this.revenueChart) { this.revenueChart.destroy(); this.revenueChart = null; }
      if (this.catChart) { this.catChart.destroy(); this.catChart = null; }

      // ── GRAPHIQUE REVENUS ──
      const parJour: any = {};
      this.commandes.forEach(c => {
        const date = new Date(c.created_at).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit'
        });
        if (!parJour[date]) parJour[date] = { revenus: 0, commandes: 0 };
        parJour[date].revenus += parseFloat(c.montant_total) || 0;
        parJour[date].commandes += 1;
      });

      const rLabels = Object.keys(parJour).length > 0
        ? Object.keys(parJour)
        : ['Auj.'];
      const rRevenus = Object.keys(parJour).length > 0
        ? Object.keys(parJour).map(d => parJour[d].revenus)
        : [this.kpis.revenus];
      const rCommandes = Object.keys(parJour).length > 0
        ? Object.keys(parJour).map(d => parJour[d].commandes)
        : [this.kpis.commandes];

      const elR = document.getElementById('revenueChart') as HTMLCanvasElement;
      if (elR) {
        this.revenueChart = new Chart(elR, {
          type: 'bar',
          data: {
            labels: rLabels,
            datasets: [
              {
                label: 'Revenus (F)',
                data: rRevenus,
                backgroundColor: 'rgba(245,166,35,0.85)',
                borderRadius: 6,
                yAxisID: 'y'
              },
              {
                label: 'Commandes',
                data: rCommandes,
                backgroundColor: 'rgba(34,168,106,0.65)',
                borderRadius: 6,
                yAxisID: 'y2'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                display: true,
                labels: { color: '#6B8F77', font: { size: 11 } }
              }
            },
            scales: {
              x: {
                grid: { color: 'rgba(34,168,106,0.06)' },
                ticks: { color: '#6B8F77', font: { size: 11 } }
              },
              y: {
                grid: { color: 'rgba(34,168,106,0.06)' },
                ticks: {
                  color: '#6B8F77', font: { size: 11 },
                  callback: (v: any) => v.toLocaleString('fr-FR') + ' F'
                }
              },
              y2: {
                position: 'right',
                grid: { display: false },
                ticks: { color: '#6B8F77', font: { size: 11 } }
              }
            }
          }
        });
      }

      // ── GRAPHIQUE CATÉGORIES ──
      const parCat: any = {};
      this.commandes.forEach(c => {
        const cat = c.restaurant_nom || 'Autre';
        parCat[cat] = (parCat[cat] || 0) + 1;
      });

      const cLabels = Object.keys(parCat).length > 0
        ? Object.keys(parCat)
        : ['Commandes'];
      const cData = Object.keys(parCat).length > 0
        ? Object.values(parCat) as number[]
        : [Math.max(this.kpis.commandes, 1)];
      const colors = ['#F5A623', '#22A86A', '#2563EB', '#FFD700', '#E74C3C', '#9B59B6'];
      const cColors = cLabels.map((_, i) => colors[i % colors.length]);

      const elC = document.getElementById('catChart') as HTMLCanvasElement;
      if (elC) {
        this.catChart = new Chart(elC, {
          type: 'doughnut',
          data: {
            labels: cLabels,
            datasets: [{
              data: cData,
              backgroundColor: cColors,
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '68%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: '#6B8F77',
                  font: { size: 11 },
                  boxWidth: 12,
                  padding: 8
                }
              }
            }
          }
        });
      }

      this.cdr.detectChanges();
    }, 800);
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL
  // ══════════════════════════════════
 private construireOptionsDashboard(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const mt = (v: any) => this.exportService.montant(v);
    const dt = (v: any) => this.exportService.date(v);

    const livrees = this.commandes.filter((c: any) => c.statut === 'livree');
    const revenu = livrees.reduce((s: number, c: any) =>
      s + (parseFloat(c.montant_total) || 0), 0);
    const panierMoyen = livrees.length > 0 ? revenu / livrees.length : 0;

    const parStatut: any = {};
    this.commandes.forEach((c: any) => {
      parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
    });

    return {
      titre: 'Tableau de bord — Vue générale',
      sousTitre: `Situation au ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `quickbite-dashboard-${dateFichier}`,
      orientation: 'landscape',
      donnees: this.commandesFiltrees.length > 0 ? this.commandesFiltrees : this.commandes,
      colonnes: [
        { cle: 'numero', titre: 'N° Commande', largeur: 24, format: (v: any) => `#${v}` },
        { cle: 'client_nom', titre: 'Client', largeur: 20 },
        { cle: 'restaurant_nom', titre: 'Restaurant', largeur: 22 },
        { cle: 'montant_total', titre: 'Montant', largeur: 16, format: mt },
        { cle: 'frais_livraison', titre: 'Livraison', largeur: 15, format: mt },
        { cle: 'statut', titre: 'Statut', largeur: 14 },
        { cle: 'mode_paiement', titre: 'Paiement', largeur: 15 },
        { cle: 'created_at', titre: 'Date', largeur: 20, format: dt }
      ],
      resume: [
        { label: 'Commandes', valeur: String(this.commandes.length) },
        { label: 'Livrées', valeur: String(livrees.length) },
        { label: 'Revenu total', valeur: mt(revenu) },
        { label: 'Panier moyen', valeur: mt(panierMoyen) },
        { label: 'Clients', valeur: String(this.kpis.clients) }
      ]
    };
  }

  exporterPDF() {
    if (this.commandes.length === 0) {
      alert('Aucune donnée à exporter pour le moment');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsDashboard());
  }

  exporterExcel() {
    if (this.commandes.length === 0) {
      alert('Aucune donnée à exporter pour le moment');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsDashboard());
  }

  // ══ ACTIONS ══
  voirCommande(c: any) {
    this.router.navigate(['/gestion-commandes']);
  }

  modifierStatutCommande(c: any) {
    this.router.navigate(['/gestion-commandes']);
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'nouvelle': 'sp-new', 'preparation': 'sp-prep',
      'en_livraison': 'sp-transit', 'livree': 'sp-done', 'annulee': 'sp-cancel'
    };
    return map[statut] || 'sp-new';
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'nouvelle': '🆕 Nouvelle', 'preparation': '🍳 Préparation',
      'en_livraison': '🛵 Livraison', 'livree': '✅ Livré', 'annulee': '✗ Annulé'
    };
    return map[statut] || statut;
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  getClientInitiale(c: any): string {
    return (c.client_prenom?.[0] || c.client_nom?.[0] || '?').toUpperCase();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.navActive = page;
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-admin', 'commandes': '/gestion-commandes',
      'menu': '/gestion-menu', 'utilisateurs': '/utilisateurs',
      'livreurs': '/livreurs', 'finances': '/finances',
      'zones': '/zones-livraison', 'statistiques': '/statistiques',
      'avis': '/avis-clients', 'rapports': '/rapports',
      'parametres': '/parametres', 'notifications': '/notifications'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  ajouterPlat() { this.router.navigate(['/gestion-menu']); }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/admin-login']);
  }
}