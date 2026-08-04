import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthStore } from '../../services/auth.store';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-rapports',
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports.html',
  styleUrl: './rapports.scss'
})
export class Rapports implements OnInit {

  private api = inject(ApiService);
  private authStore = inject(AuthStore);
  private exportService = inject(ExportService);
  private router = inject(Router);
  public cdr = inject(ChangeDetectorRef);

  sidebarOpen = false;
  loading = false;

  typeRapport = 'revenus';
  formatExport = 'pdf';
  dateDebut = '';
  dateFin = '';

  commandes: any[] = [];
  plats: any[] = [];
  utilisateurs: any[] = [];

  kpis: any = {
    revenus: 0,
    commandes: 0,
    utilisateurs: { clients: 0, livreurs: 0, total: 0 },
    plats: 0
  };

  rapportsRecents: any[] = [];

  get admin() {
    return this.authStore.utilisateur();
  }

  ngOnInit() {
    this.initialiserDates();
    this.chargerDonnees();
    this.chargerHistorique();
  }

  initialiserDates() {
    const fin = new Date();
    const debut = new Date();
    debut.setDate(debut.getDate() - 30);
    this.dateFin = fin.toISOString().split('T')[0];
    this.dateDebut = debut.toISOString().split('T')[0];
  }

  // ══════════════════════════════════
  // CHARGEMENT DES DONNÉES
  // ══════════════════════════════════
  chargerDonnees() {
    this.api.get<any>('commandes').subscribe({
      next: (data) => {
        if (data.success) {
          this.commandes = data.data || [];
          this.kpis.commandes = this.commandes.length;
          this.kpis.revenus = this.commandes
            .filter((c: any) => c.statut === 'livree')
            .reduce((s: number, c: any) => s + (parseFloat(c.montant_total) || 0), 0);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.api.get<any>('plats').subscribe({
      next: (data) => {
        if (data.success) {
          this.plats = data.data || [];
          this.kpis.plats = this.plats.length;
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.api.get<any>('utilisateurs').subscribe({
      next: (data) => {
        if (data.success) {
          this.utilisateurs = data.data || [];
          this.kpis.utilisateurs = {
            clients: this.utilisateurs.filter((u: any) => u.role === 'client').length,
            livreurs: this.utilisateurs.filter((u: any) => u.role === 'livreur').length,
            total: this.utilisateurs.length
          };
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // ══════════════════════════════════
  // GÉNÉRATION
  // ══════════════════════════════════
  genererRapport() {
    this.loading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      const commandesFiltrees = this.commandes.filter(c => {
        if (!this.dateDebut || !this.dateFin) return true;
        const date = new Date(c.created_at);
        const debut = new Date(this.dateDebut);
        const fin = new Date(this.dateFin);
        fin.setHours(23, 59, 59);
        return date >= debut && date <= fin;
      });

      this.produireExport(commandesFiltrees);

      this.loading = false;
      this.cdr.detectChanges();
    }, 500);
  }

  produireExport(commandes: any[]) {
    const options = this.construireOptions(commandes);

    if (this.formatExport === 'pdf') {
      this.exportService.exporterPDF(options);
    } else if (this.formatExport === 'excel') {
      this.exportService.exporterExcel(options);
    } else {
      this.exportService.exporterCSV(options);
    }

    this.enregistrerDansHistorique(options, options.donnees.length);
  }

  // ══════════════════════════════════
  // COLONNES SELON LE TYPE DE RAPPORT
  // ══════════════════════════════════
  private construireOptions(commandes: any[]): any {

    const dateFichier = new Date().toISOString().split('T')[0];
    const periode = (this.dateDebut && this.dateFin)
      ? `Période du ${this.formaterDateCourte(this.dateDebut)} au ${this.formaterDateCourte(this.dateFin)}`
      : 'Toutes périodes confondues';

    const mt = (v: any) => this.exportService.montant(v);
    const dt = (v: any) => this.exportService.date(v);

    // ── REVENUS ──
    if (this.typeRapport === 'revenus') {
      const livrees = commandes.filter(c => c.statut === 'livree');
      const brut = livrees.reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0);
      const commission = Math.round(brut * 0.08);

      return {
        titre: 'Rapport des revenus',
        sousTitre: periode,
        nomFichier: `quickbite-revenus-${dateFichier}`,
        orientation: 'landscape',
        donnees: commandes,
        colonnes: [
          { cle: 'numero', titre: 'N° Commande', largeur: 24, format: (v: any) => `#${v}` },
          { cle: 'client_nom', titre: 'Client', largeur: 20 },
          { cle: 'montant_total', titre: 'Montant', largeur: 16, format: mt },
          { cle: 'montant_total', titre: 'Commission 8%', largeur: 17,
            format: (v: any) => mt(Math.round((parseFloat(v) || 0) * 0.08)) },
          { cle: 'montant_total', titre: 'Net', largeur: 16,
            format: (v: any) => {
              const m = parseFloat(v) || 0;
              return mt(m - Math.round(m * 0.08));
            }
          },
          { cle: 'mode_paiement', titre: 'Paiement', largeur: 15 },
          { cle: 'statut', titre: 'Statut', largeur: 14 },
          { cle: 'created_at', titre: 'Date', largeur: 20, format: dt }
        ],
        resume: [
          { label: 'Commandes', valeur: String(commandes.length) },
          { label: 'Livrées', valeur: String(livrees.length) },
          { label: 'Revenu brut', valeur: mt(brut) },
          { label: 'Commission', valeur: mt(commission) },
          { label: 'Net', valeur: mt(brut - commission) }
        ]
      };
    }

    // ── COMMANDES ──
    if (this.typeRapport === 'commandes') {
      const parStatut: any = {};
      commandes.forEach(c => {
        parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
      });

      return {
        titre: 'Rapport des commandes',
        sousTitre: periode,
        nomFichier: `quickbite-commandes-${dateFichier}`,
        orientation: 'landscape',
        donnees: commandes,
        colonnes: [
          { cle: 'numero', titre: 'N° Commande', largeur: 24, format: (v: any) => `#${v}` },
          { cle: 'client_nom', titre: 'Client', largeur: 20 },
          { cle: 'restaurant_nom', titre: 'Restaurant', largeur: 22 },
          { cle: 'adresse_livraison', titre: 'Adresse', largeur: 28 },
          { cle: 'montant_total', titre: 'Montant', largeur: 16, format: mt },
          { cle: 'frais_livraison', titre: 'Livraison', largeur: 15, format: mt },
          { cle: 'statut', titre: 'Statut', largeur: 14 },
          { cle: 'created_at', titre: 'Date', largeur: 20, format: dt }
        ],
        resume: [
          { label: 'Total', valeur: String(commandes.length) },
          { label: 'Livrées', valeur: String(parStatut['livree'] || 0) },
          { label: 'En cours', valeur: String(parStatut['en_livraison'] || 0) },
          { label: 'Annulées', valeur: String(parStatut['annulee'] || 0) }
        ]
      };
    }

    // ── MENU ──
    if (this.typeRapport === 'menu') {
      const tries = [...this.plats]
        .sort((a, b) => (b.nombre_commandes || 0) - (a.nombre_commandes || 0))
        .slice(0, 20)
        .map((p, i) => ({ ...p, rang: i + 1 }));

      const totalVentes = tries.reduce((s, p) =>
        s + ((p.nombre_commandes || 0) * (parseFloat(p.prix) || 0)), 0);

      return {
        titre: 'Performance du menu',
        sousTitre: periode,
        nomFichier: `quickbite-menu-${dateFichier}`,
        orientation: 'portrait',
        donnees: tries,
        colonnes: [
          { cle: 'rang', titre: 'Rang', largeur: 10 },
          { cle: 'nom', titre: 'Plat', largeur: 38 },
          { cle: 'categorie_nom', titre: 'Catégorie', largeur: 20 },
          { cle: 'nombre_commandes', titre: 'Vendus', largeur: 14,
            format: (v: any) => String(v || 0) },
          { cle: 'prix', titre: 'Prix unitaire', largeur: 18, format: mt },
          { cle: 'prix', titre: 'Revenus', largeur: 18,
            format: (v: any, ligne: any) =>
              mt((parseFloat(v) || 0) * (ligne.nombre_commandes || 0))
          }
        ],
        resume: [
          { label: 'Plats analysés', valeur: String(tries.length) },
          { label: 'Meilleure vente', valeur: tries[0]?.nom || '—' },
          { label: 'Revenus menu', valeur: mt(totalVentes) }
        ]
      };
    }

    // ── SYNTHÈSE ──
    const livrees = commandes.filter(c => c.statut === 'livree');
    const revenu = livrees.reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0);
    const panierMoyen = livrees.length > 0 ? revenu / livrees.length : 0;

    const metriques = [
      { metrique: 'Commandes totales', valeur: String(commandes.length) },
      { metrique: 'Commandes livrées', valeur: String(livrees.length) },
      { metrique: 'Revenu total', valeur: mt(revenu) },
      { metrique: 'Panier moyen', valeur: mt(panierMoyen) },
      { metrique: 'Commission plateforme (8%)', valeur: mt(revenu * 0.08) },
      { metrique: 'Net restaurateurs', valeur: mt(revenu * 0.92) },
      { metrique: 'Plats au catalogue', valeur: String(this.plats.length) },
      { metrique: 'Clients inscrits', valeur: String(this.kpis.utilisateurs.clients) },
      { metrique: 'Livreurs actifs', valeur: String(this.kpis.utilisateurs.livreurs) }
    ];

    return {
      titre: 'Synthèse globale',
      sousTitre: periode,
      nomFichier: `quickbite-synthese-${dateFichier}`,
      orientation: 'portrait',
      donnees: metriques,
      colonnes: [
        { cle: 'metrique', titre: 'Indicateur', largeur: 45 },
        { cle: 'valeur', titre: 'Valeur', largeur: 28 }
      ],
      resume: [
        { label: 'Commandes', valeur: String(commandes.length) },
        { label: 'Revenu', valeur: mt(revenu) },
        { label: 'Panier moyen', valeur: mt(panierMoyen) }
      ]
    };
  }

  // ══════════════════════════════════
  // HISTORIQUE
  // ══════════════════════════════════
  private enregistrerDansHistorique(options: any, nbLignes: number) {

    const styles: any = {
      'pdf':   { format: 'PDF',   classe: 'type-pdf',   icone: '📄', ic: 'ri-pdf' },
      'excel': { format: 'Excel', classe: 'type-excel', icone: '📊', ic: 'ri-excel' },
      'csv':   { format: 'CSV',   classe: 'type-csv',   icone: '📋', ic: 'ri-csv' }
    };

    const s = styles[this.formatExport] || styles['csv'];

    this.sauvegarderRapport({
      id: Date.now(),
      nom: options.titre,
      periode: options.sousTitre,
      date: new Date().toLocaleString('fr-FR'),
      format: s.format,
      formatClass: s.classe,
      iconeClass: s.ic,
      icone: s.icone,
      taille: `${nbLignes} ligne${nbLignes > 1 ? 's' : ''}`,
      typeRapport: this.typeRapport,
      formatExport: this.formatExport
    });
  }

  sauvegarderRapport(rapport: any) {
    this.rapportsRecents.unshift(rapport);
    if (this.rapportsRecents.length > 10) {
      this.rapportsRecents = this.rapportsRecents.slice(0, 10);
    }
    localStorage.setItem('rapports_recents', JSON.stringify(this.rapportsRecents));
    this.cdr.detectChanges();
  }

  chargerHistorique() {
    try {
      const brut = localStorage.getItem('rapports_recents');
      if (brut) this.rapportsRecents = JSON.parse(brut);
    } catch (e) {
      this.rapportsRecents = [];
    }
    this.cdr.detectChanges();
  }

  // ══════════════════════════════════
  // RE-TÉLÉCHARGEMENT
  // ══════════════════════════════════
  telechargerRapport(rapport: any) {
    const typeSauve = this.typeRapport;
    const formatSauve = this.formatExport;

    this.typeRapport = rapport.typeRapport || this.typeRapport;
    this.formatExport = rapport.formatExport || 'csv';

    const commandesFiltrees = this.commandes.filter(c => {
      if (!this.dateDebut || !this.dateFin) return true;
      const date = new Date(c.created_at);
      const debut = new Date(this.dateDebut);
      const fin = new Date(this.dateFin);
      fin.setHours(23, 59, 59);
      return date >= debut && date <= fin;
    });

    const options = this.construireOptions(commandesFiltrees);

    if (this.formatExport === 'pdf') this.exportService.exporterPDF(options);
    else if (this.formatExport === 'excel') this.exportService.exporterExcel(options);
    else this.exportService.exporterCSV(options);

    this.typeRapport = typeSauve;
    this.formatExport = formatSauve;
  }

  supprimerRapport(rapport: any) {
    if (!confirm(`Retirer "${rapport.nom}" de l'historique ?`)) return;
    this.rapportsRecents = this.rapportsRecents.filter(r => r.id !== rapport.id);
    localStorage.setItem('rapports_recents', JSON.stringify(this.rapportsRecents));
    this.cdr.detectChanges();
  }

  // ══════════════════════════════════
  // RACCOURCIS
  // ══════════════════════════════════
  genererRapide(type: string, format: string) {
    this.typeRapport = type;
    this.formatExport = format;
    this.genererRapport();
  }

  setPeriode(jours: number) {
    const fin = new Date();
    const debut = new Date();
    debut.setDate(debut.getDate() - jours);
    this.dateFin = fin.toISOString().split('T')[0];
    this.dateDebut = debut.toISOString().split('T')[0];
    this.cdr.detectChanges();
  }

  // ══════════════════════════════════
  // AFFICHAGE
  // ══════════════════════════════════
  private formaterDateCourte(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR');
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  getTypeLabel(type: string): string {
    const map: any = {
      'revenus': 'Revenus',
      'commandes': 'Commandes',
      'menu': 'Performance menu',
      'synthese': 'Synthèse globale'
    };
    return map[type] || type;
  }

  getFormatLabel(format: string): string {
    const map: any = { 'pdf': 'PDF', 'excel': 'Excel', 'csv': 'CSV' };
    return map[format] || format;
  }

  // ══════════════════════════════════
  // NAVIGATION
  // ══════════════════════════════════
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
    this.authStore.deconnecter('/admin-login');
  }
}