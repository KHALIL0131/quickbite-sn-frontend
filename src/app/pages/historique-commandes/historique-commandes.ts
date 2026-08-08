import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-historique-commandes',
  imports: [CommonModule, FormsModule],
  templateUrl: './historique-commandes.html',
  styleUrl: './historique-commandes.scss'
})
export class HistoriqueCommandes implements OnInit {

  utilisateur: any = null;
  commandes: any[] = [];
  commandesFiltrees: any[] = [];
  loading = true;
  cartCount = 0;

  // FILTRES
  filtreActif = 'toutes';
  sortActif = 'recent';
  periodeFiltree = 'tout';

  // PAGINATION
  page = 1;
  parPage = 10;

  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    public cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.chargerCommandes();
    this.chargerPanier();
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.utilisateur = JSON.parse(user);
  }

  chargerPanier() {
    const p = JSON.parse(localStorage.getItem('panier') || '[]');
    this.cartCount = p.reduce((s: number, i: any) => s + i.quantite, 0);
  }

  chargerCommandes() {
    this.loading = true;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/mes-commandes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.commandes = data.data.map((c: any) => ({ ...c, ouvert: false }));
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  filtrer() {
    let result = [...this.commandes];

    // Filtre statut
    if (this.filtreActif === 'livrees') result = result.filter(c => c.statut === 'livree');
    else if (this.filtreActif === 'annulees') result = result.filter(c => c.statut === 'annulee');
    else if (this.filtreActif === 'encours') result = result.filter(c =>
      ['nouvelle', 'preparation', 'en_livraison'].includes(c.statut)
    );

    // Filtre période
    if (this.periodeFiltree === 'mois') {
      const debut = new Date(); debut.setDate(1);
      result = result.filter(c => new Date(c.created_at) >= debut);
    } else if (this.periodeFiltree === '3mois') {
      const debut = new Date(); debut.setMonth(debut.getMonth() - 3);
      result = result.filter(c => new Date(c.created_at) >= debut);
    }

    // Tri
    if (this.sortActif === 'ancien') result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    else if (this.sortActif === 'prix') result.sort((a, b) => b.montant_total - a.montant_total);
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    this.commandesFiltrees = result;
    this.page = 1;
    this.cdr.detectChanges();
  }

  setFiltre(f: string) { this.filtreActif = f; this.filtrer(); }

  // COMMANDES PAR MOIS
  get commandesParMois() {
    const groupes: any = {};
    const paginees = this.commandesFiltrees.slice((this.page - 1) * this.parPage, this.page * this.parPage);
    paginees.forEach(c => {
      const d = new Date(c.created_at);
      const key = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      if (!groupes[key]) groupes[key] = [];
      groupes[key].push(c);
    });
    return Object.entries(groupes).map(([mois, cmds]) => ({ mois, cmds }));
  }

  get totalPages() { return Math.ceil(this.commandesFiltrees.length / this.parPage); }
  get pages() { return Array.from({ length: this.totalPages }, (_, i) => i + 1); }

  // STATS
  get totalCommandes() { return this.commandes.length; }
  get totalDepense() { return this.commandes.filter(c => c.statut === 'livree').reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0); }
  get totalLivrees() { return this.commandes.filter(c => c.statut === 'livree').length; }
  get totalAnnulees() { return this.commandes.filter(c => c.statut === 'annulee').length; }
  get totalEnCours() { return this.commandes.filter(c => ['nouvelle','preparation','en_livraison'].includes(c.statut)).length; }

  toggleDetail(commande: any) {
    commande.ouvert = !commande.ouvert;
    this.cdr.detectChanges();
  }

  recommander(commande: any) {
    if (!commande.details || commande.details.length === 0) return;
    const panier = commande.details.map((d: any) => ({
      id: d.plat_id, nom: d.plat_nom,
      prix: d.prix_unitaire, emoji: d.emoji || '🍽️',
      restaurant_id: commande.restaurant_id,
      restaurant_nom: commande.restaurant_nom,
      quantite: d.quantite
    }));
    localStorage.setItem('panier', JSON.stringify(panier));
    this.router.navigate(['/panier']);
  }

  suivreCommande(commande: any) {
    this.router.navigate(['/suivi-commande'], { queryParams: { commande_id: commande.id } });
  }

  viderHistorique() {
    if (!confirm('Vider tout votre historique de commandes ? Cette action est irréversible.')) return;
    this.commandes = [];
    this.commandesFiltrees = [];
    this.cdr.detectChanges();
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL / CSV
  // ══════════════════════════════════
  private construireOptionsHistorique(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const mt = (v: any) => this.exportService.montant(v);
    const dt = (v: any) => this.exportService.date(v);

    const source = this.commandesFiltrees.length > 0
      ? this.commandesFiltrees
      : this.commandes;

    const livrees = source.filter(c => c.statut === 'livree');
    const total = livrees.reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0);
    const panierMoyen = livrees.length > 0 ? total / livrees.length : 0;

    return {
      titre: 'Mon historique de commandes',
      sousTitre: `${this.utilisateur?.prenom || ''} ${this.utilisateur?.nom || ''} · ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `mes-commandes-quickbite-${dateFichier}`,
      orientation: 'landscape',
      donnees: source,
      colonnes: [
        { cle: 'numero', titre: 'N° Commande', largeur: 24, format: (v: any) => `#${v}` },
        { cle: 'restaurant_nom', titre: 'Restaurant', largeur: 24,
          format: (v: any) => v || '—' },
        { cle: 'adresse_livraison', titre: 'Adresse', largeur: 30,
          format: (v: any) => v || '—' },
        { cle: 'montant_total', titre: 'Montant', largeur: 16, format: mt },
        { cle: 'frais_livraison', titre: 'Livraison', largeur: 15, format: mt },
        { cle: 'mode_paiement', titre: 'Paiement', largeur: 15,
          format: (v: any) => v || '—' },
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
        { label: 'Commandes', valeur: String(source.length) },
        { label: 'Livrées', valeur: String(livrees.length) },
        { label: 'En cours', valeur: String(this.totalEnCours) },
        { label: 'Total dépensé', valeur: mt(total) },
        { label: 'Panier moyen', valeur: mt(panierMoyen) }
      ]
    };
  }

  exporterPDF() {
    if (this.commandes.length === 0) {
      alert('Aucune commande à exporter');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsHistorique());
  }

  exporterExcel() {
    if (this.commandes.length === 0) {
      alert('Aucune commande à exporter');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsHistorique());
  }

  exporterCSV() {
    if (this.commandes.length === 0) {
      alert('Aucune commande à exporter');
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsHistorique());
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'livree': 'sp-done', 'annulee': 'sp-cancel',
      'nouvelle': 'sp-new', 'preparation': 'sp-prep', 'en_livraison': 'sp-transit'
    };
    return map[statut] || 'sp-new';
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'livree': '✅ Livré', 'annulee': '✗ Annulé',
      'nouvelle': '🆕 Nouvelle', 'preparation': '👨‍🍳 Préparation', 'en_livraison': '🛵 En livraison'
    };
    return map[statut] || statut;
  }

  getMoisTotal(cmds: any[]): number {
    return cmds.filter(c => c.statut === 'livree').reduce((s, c) => s + (parseFloat(c.montant_total) || 0), 0);
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  getInitiales(): string {
    if (!this.utilisateur) return '?';
    return ((this.utilisateur.prenom?.[0] || '') + (this.utilisateur.nom?.[0] || '')).toUpperCase();
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToPanier() { this.router.navigate(['/panier']); }
  goToProfil() { this.router.navigate(['/profil-client']); }

  goToMessagerie() { this.router.navigate(['/messagerie']); }
}