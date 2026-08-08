import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mes-livraisons',
  imports: [CommonModule, FormsModule],
  templateUrl: './mes-livraisons.html',
  styleUrl: './mes-livraisons.scss'
})
export class MesLivraisons implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;

  commandes: any[] = [];
  commandesFiltrees: any[] = [];
  filtreActif = 'toutes';
  searchQuery = '';

  stats = { toutes: 0, encours: 0, livrees: 0, annulees: 0 };

  private apiUrl = environment.apiUrl;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerCommandes();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

  chargerCommandes() {
    this.loading = true;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/livreur/mes-livraisons`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.commandes = data.data || [];
        this.calculerStats();
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  calculerStats() {
    this.stats.toutes = this.commandes.length;
    this.stats.encours = this.commandes.filter(c =>
      ['nouvelle', 'preparation', 'en_livraison'].includes(c.statut)).length;
    this.stats.livrees = this.commandes.filter(c => c.statut === 'livree').length;
    this.stats.annulees = this.commandes.filter(c => c.statut === 'annulee').length;
  }

  filtrer() {
    let result = [...this.commandes];
    if (this.filtreActif === 'encours') {
      result = result.filter(c => ['nouvelle', 'preparation', 'en_livraison'].includes(c.statut));
    } else if (this.filtreActif === 'livrees') {
      result = result.filter(c => c.statut === 'livree');
    } else if (this.filtreActif === 'annulees') {
      result = result.filter(c => c.statut === 'annulee');
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(c =>
        c.numero?.toLowerCase().includes(q) ||
        c.client_nom?.toLowerCase().includes(q) ||
        c.restaurant_nom?.toLowerCase().includes(q)
      );
    }
    this.commandesFiltrees = result;
    this.cdr.detectChanges();
  }

  setFiltre(f: string) { this.filtreActif = f; this.filtrer(); }

  voirCommande(c: any) {
    this.router.navigate(['/suivi-commande'], { queryParams: { commande_id: c.id } });
  }

  accepterCommande(c: any) {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${c.id}/statut`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ statut: 'en_livraison' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) { c.statut = 'en_livraison'; this.calculerStats(); this.filtrer(); }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  livrerCommande(c: any) {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${c.id}/statut`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ statut: 'livree' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) { c.statut = 'livree'; this.calculerStats(); this.filtrer(); }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

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
      'carburant': '/carburant', 'entretien': '/entretien', 'profil': '/profil-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}