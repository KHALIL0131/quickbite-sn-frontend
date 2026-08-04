import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-historique-livreur',
  imports: [CommonModule, FormsModule],
  templateUrl: './historique-livreur.html',
  styleUrl: './historique-livreur.scss'
})
export class HistoriqueLivreur implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;

  livraisons: any[] = [];
  livraisonsFiltrees: any[] = [];
  filtreActif = 'toutes';
  searchQuery = '';
  sortActif = 'recent';
  page = 1;
  totalPages = 1;
  parPage = 10;

  stats = {
    total: 0,
    livrees: 0,
    annulees: 0,
    gains: 0
  };

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerHistorique();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

  chargerHistorique() {
    this.loading = true;
    const token = localStorage.getItem('token');

    const timeout = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 5000);

    fetch(`${this.apiUrl}/livreur/historique?limit=50&page=${this.page}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeout);
      if (data.success) {
        this.livraisons = data.data || [];
        this.totalPages = data.pages || 1;
        this.calculerStats();
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  calculerStats() {
    this.stats.total = this.livraisons.length;
    this.stats.livrees = this.livraisons.filter(c => c.statut === 'livree').length;
    this.stats.annulees = this.livraisons.filter(c => c.statut === 'annulee').length;
    this.stats.gains = this.livraisons
      .filter(c => c.statut === 'livree')
      .reduce((s, c) => s + Math.round(parseFloat(c.frais_livraison) || 0), 0);
  }

  filtrer() {
    let result = [...this.livraisons];

    if (this.filtreActif === 'livrees') {
      result = result.filter(c => c.statut === 'livree');
    } else if (this.filtreActif === 'annulees') {
      result = result.filter(c => c.statut === 'annulee');
    } else if (this.filtreActif === 'encours') {
      result = result.filter(c => ['nouvelle', 'preparation', 'en_livraison'].includes(c.statut));
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(c =>
        c.numero?.toLowerCase().includes(q) ||
        c.client_nom?.toLowerCase().includes(q) ||
        c.restaurant_nom?.toLowerCase().includes(q) ||
        c.adresse_livraison?.toLowerCase().includes(q)
      );
    }

    if (this.sortActif === 'ancien') {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (this.sortActif === 'gains') {
      result.sort((a, b) => b.montant_total - a.montant_total);
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    this.livraisonsFiltrees = result;
    this.cdr.detectChanges();
  }

  setFiltre(f: string) { this.filtreActif = f; this.filtrer(); }

  getGain(c: any): number {
    return Math.round(parseFloat(c.frais_livraison) || 0);
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
      'nouvelle': '🆕 Nouvelle', 'preparation': '👨‍🍳 Préparation',
      'en_livraison': '🛵 En livraison', 'livree': '✅ Livré', 'annulee': '✗ Annulé'
    };
    return map[statut] || statut;
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  formaterDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL / CSV
  // ══════════════════════════════════
  private construireOptionsLivreur(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const mt = (v: any) => this.exportService.montant(v);
    const dt = (v: any) => this.exportService.date(v);

    const source = this.livraisonsFiltrees.length > 0
      ? this.livraisonsFiltrees
      : this.livraisons;

    return {
      titre: 'Historique de mes livraisons',
      sousTitre: `${this.livreur?.prenom || ''} ${this.livreur?.nom || ''} · ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `mes-livraisons-quickbite-${dateFichier}`,
      orientation: 'landscape',
      donnees: source,
      colonnes: [
        { cle: 'numero', titre: 'N° Commande', largeur: 24, format: (v: any) => `#${v}` },
        { cle: 'client_prenom', titre: 'Client', largeur: 20,
          format: (v: any, l: any) => `${v || ''} ${l.client_nom || ''}`.trim() || '—' },
        { cle: 'restaurant_nom', titre: 'Restaurant', largeur: 22,
          format: (v: any) => v || '—' },
        { cle: 'adresse_livraison', titre: 'Adresse', largeur: 28,
          format: (v: any) => v || '—' },
        { cle: 'montant_total', titre: 'Montant', largeur: 16, format: mt },
        { cle: 'frais_livraison', titre: 'Mon gain', largeur: 16, format: mt },
        { cle: 'statut', titre: 'Statut', largeur: 14,
          format: (v: any) => {
            const map: any = {
              'livree': 'Livré', 'annulee': 'Annulé', 'nouvelle': 'Nouvelle',
              'preparation': 'Préparation', 'en_livraison': 'En livraison'
            };
            return map[v] || v;
          }
        },
        { cle: 'created_at', titre: 'Date', largeur: 20, format: dt }
      ],
      resume: [
        { label: 'Livraisons', valeur: String(this.stats.total) },
        { label: 'Réussies', valeur: String(this.stats.livrees) },
        { label: 'Annulées', valeur: String(this.stats.annulees) },
        { label: 'Gains totaux', valeur: mt(this.stats.gains) },
        { label: 'Taux réussite', valeur: `${this.getTauxReussite()}%` }
      ]
    };
  }

  exporterPDF() {
    if (this.livraisons.length === 0) {
      alert('Aucune livraison à exporter');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsLivreur());
  }

  exporterExcel() {
    if (this.livraisons.length === 0) {
      alert('Aucune livraison à exporter');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsLivreur());
  }

  exporterCSV() {
    if (this.livraisons.length === 0) {
      alert('Aucune livraison à exporter');
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsLivreur());
  }

  getTauxReussite(): number {
    if (this.stats.total === 0) return 0;
    return Math.round(this.stats.livrees / this.stats.total * 100);
  }

  getTotalMontant(): number {
    return this.livraisonsFiltrees.reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0);
  }

  getTotalGains(): number {
    return this.livraisonsFiltrees
      .filter(c => c.statut === 'livree')
      .reduce((s, c) => s + this.getGain(c), 0);
  }

  getInitiales(): string {
    if (!this.livreur) return 'L';
    return ((this.livreur.prenom?.[0] || '') + (this.livreur.nom?.[0] || '')).toUpperCase();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-livreur', 'livraisons': '/mes-livraisons',
      'historique': '/historique-livreur', 'gains': '/gains-livreur',
      'carte': '/carte-livreur', 'moto': '/mon-moto',
      'carburant': '/carburant', 'entretien': '/entretien',
      'messagerie': '/messagerie-livreur',
      'profil': '/profil-livreur', 'parametres': '/profil-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}