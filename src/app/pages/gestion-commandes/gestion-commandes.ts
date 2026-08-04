import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-gestion-commandes',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-commandes.html',
  styleUrl: './gestion-commandes.scss'
})
export class GestionCommandes implements OnInit {

  admin: any = null;
  sidebarOpen = false;

  toutesCommandes: any[] = [];
  commandesFiltrees: any[] = [];
  loading = true;

  searchQuery = '';
  filtreActif = 'toutes';
  filtreStatut = '';
  filtrePaiement = '';

  stats = { toutes: 0, nouvelles: 0, preparation: 0, livraison: 0, livrees: 0, annulees: 0 };

  // MODAL DETAIL
  showDetailModal = false;
  commandeSelectionnee: any = null;

  // ══ ASSIGNATION LIVREUR ══
  livreurs: any[] = [];
  livreurChoisi: any = '';
  loadingAssignation = false;
  succesAssignation = '';
  erreurAssignation = '';

  private socket!: Socket;
  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.connecterSocket();
    this.chargerCommandes();
    this.chargerLivreurs();
  }

  connecterSocket() {
    this.socket = io('http://localhost:3000', { transports: ['websocket', 'polling'] });
    this.socket.on('connect', () => {
      if (this.admin) this.socket.emit('rejoindre', this.admin.id);
    });
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerCommandes() {
    this.loading = true;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.toutesCommandes = data.data || [];
        this.calculerStats();
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  // ══ CHARGER LES LIVREURS DISPONIBLES ══
  chargerLivreurs() {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/utilisateurs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.livreurs = (data.data || [])
          .filter((u: any) => u.role === 'livreur' && u.est_actif == 1);
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  // ══ ASSIGNER UN LIVREUR ══
  assignerLivreur() {
    if (!this.livreurChoisi) {
      this.erreurAssignation = 'Veuillez choisir un livreur';
      setTimeout(() => { this.erreurAssignation = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }
    if (!this.commandeSelectionnee) return;

    this.loadingAssignation = true;
    this.erreurAssignation = '';
    this.cdr.detectChanges();

    const token = localStorage.getItem('token');
    const livreurId = parseInt(this.livreurChoisi);

    fetch(`${this.apiUrl}/commandes/${this.commandeSelectionnee.id}/assigner`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ livreur_id: livreurId })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingAssignation = false;
      if (data.success) {
        const liv = this.livreurs.find(l => l.id === livreurId);

        // Mise à jour locale
        this.commandeSelectionnee.livreur_id = livreurId;
        this.commandeSelectionnee.livreur_nom = liv?.nom;
        this.commandeSelectionnee.livreur_prenom = liv?.prenom;
        this.commandeSelectionnee.statut = 'en_livraison';

        const cmd = this.toutesCommandes.find(c => c.id === this.commandeSelectionnee.id);
        if (cmd) {
          cmd.livreur_id = livreurId;
          cmd.livreur_nom = liv?.nom;
          cmd.livreur_prenom = liv?.prenom;
          cmd.statut = 'en_livraison';
        }

        // Notification temps réel au livreur
        this.socket.emit('assigner_commande', {
          livreur_id: livreurId,
          commande: {
            id: this.commandeSelectionnee.id,
            numero: this.commandeSelectionnee.numero,
            client_nom: this.commandeSelectionnee.client_nom,
            client_prenom: this.commandeSelectionnee.client_prenom,
            client_telephone: this.commandeSelectionnee.client_telephone,
            adresse_livraison: this.commandeSelectionnee.adresse_livraison,
            restaurant_nom: this.commandeSelectionnee.restaurant_nom,
            montant_total: this.commandeSelectionnee.montant_total,
            client_id: this.commandeSelectionnee.client_id
          }
        });

        this.succesAssignation =
          `✅ Commande assignée à ${liv?.prenom} ${liv?.nom}`;
        this.livreurChoisi = '';
        this.calculerStats();
        this.filtrer();
        setTimeout(() => { this.succesAssignation = ''; this.cdr.detectChanges(); }, 4000);
      } else {
        this.erreurAssignation = data.message || 'Erreur lors de l\'assignation';
        setTimeout(() => { this.erreurAssignation = ''; this.cdr.detectChanges(); }, 3000);
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingAssignation = false;
      this.erreurAssignation = 'Erreur de connexion au serveur';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreurAssignation = ''; this.cdr.detectChanges(); }, 3000);
    });
  }

  // ══ RETIRER LE LIVREUR ══
  retirerLivreur() {
    if (!this.commandeSelectionnee) return;
    if (!confirm('Retirer le livreur de cette commande ?')) return;

    this.loadingAssignation = true;
    this.cdr.detectChanges();

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${this.commandeSelectionnee.id}/assigner`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ livreur_id: null })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingAssignation = false;
      if (data.success) {
        this.commandeSelectionnee.livreur_id = null;
        this.commandeSelectionnee.livreur_nom = null;
        this.commandeSelectionnee.livreur_prenom = null;

        const cmd = this.toutesCommandes.find(c => c.id === this.commandeSelectionnee.id);
        if (cmd) {
          cmd.livreur_id = null;
          cmd.livreur_nom = null;
          cmd.livreur_prenom = null;
        }

        this.succesAssignation = '✅ Livreur retiré de la commande';
        setTimeout(() => { this.succesAssignation = ''; this.cdr.detectChanges(); }, 3000);
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingAssignation = false;
      this.erreurAssignation = 'Erreur de connexion';
      this.cdr.detectChanges();
    });
  }

  calculerStats() {
    this.stats.toutes = this.toutesCommandes.length;
    this.stats.nouvelles = this.toutesCommandes.filter(c => c.statut === 'nouvelle').length;
    this.stats.preparation = this.toutesCommandes.filter(c => c.statut === 'preparation').length;
    this.stats.livraison = this.toutesCommandes.filter(c => c.statut === 'en_livraison').length;
    this.stats.livrees = this.toutesCommandes.filter(c => c.statut === 'livree').length;
    this.stats.annulees = this.toutesCommandes.filter(c => c.statut === 'annulee').length;
  }

  filtrer() {
    let result = [...this.toutesCommandes];

    if (this.filtreActif !== 'toutes') {
      const mapFiltre: any = {
        'nouvelles': 'nouvelle', 'preparation': 'preparation',
        'livraison': 'en_livraison', 'livrees': 'livree', 'annulees': 'annulee'
      };
      if (mapFiltre[this.filtreActif]) {
        result = result.filter(c => c.statut === mapFiltre[this.filtreActif]);
      }
    }

    if (this.filtreStatut) {
      result = result.filter(c => c.statut === this.filtreStatut);
    }

    if (this.filtrePaiement) {
      result = result.filter(c => c.mode_paiement === this.filtrePaiement);
    }

    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(c =>
        (c.numero || '').toLowerCase().includes(q) ||
        (c.client_nom || '').toLowerCase().includes(q) ||
        (c.client_prenom || '').toLowerCase().includes(q) ||
        (c.restaurant_nom || '').toLowerCase().includes(q)
      );
    }

    this.commandesFiltrees = result;
    this.cdr.detectChanges();
  }

  setFiltre(f: string) {
    this.filtreActif = f;
    this.filtrer();
  }

  // ══ VOIR DÉTAIL ══
  voirCommande(commande: any) {
    this.commandeSelectionnee = { ...commande };
    this.showDetailModal = true;
    this.livreurChoisi = commande.livreur_id || '';
    this.succesAssignation = '';
    this.erreurAssignation = '';
    this.cdr.detectChanges();

    if (!commande.details) {
      const token = localStorage.getItem('token');
      fetch(`${this.apiUrl}/commandes/${commande.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          commande.details = data.data.details || [];
          this.commandeSelectionnee = { ...commande };
        }
        this.cdr.detectChanges();
      }).catch(() => {});
    }
  }

  fermerDetail() {
    this.showDetailModal = false;
    this.livreurChoisi = '';
    this.succesAssignation = '';
    this.erreurAssignation = '';
    this.cdr.detectChanges();
  }

  // ══ SUPPRIMER ══
  supprimerCommande(commande: any) {
    if (!confirm(`Supprimer la commande #${commande.numero} ?`)) return;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${commande.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(() => {
      this.toutesCommandes = this.toutesCommandes.filter(c => c.id !== commande.id);
      this.calculerStats();
      this.filtrer();
      this.showDetailModal = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.toutesCommandes = this.toutesCommandes.filter(c => c.id !== commande.id);
      this.calculerStats();
      this.filtrer();
      this.showDetailModal = false;
      this.cdr.detectChanges();
    });
  }

  // ══ CHANGER STATUT ══
  changerStatut(commande: any, nouveauStatut: string) {
    // Bloquer le passage en livraison sans livreur assigné
    if (nouveauStatut === 'en_livraison' && !commande.livreur_id) {
      this.commandeSelectionnee = { ...commande };
      this.showDetailModal = true;
      this.erreurAssignation = '⚠️ Assignez d\'abord un livreur à cette commande';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreurAssignation = ''; this.cdr.detectChanges(); }, 5000);
      return;
    }

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${commande.id}/statut`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ statut: nouveauStatut })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        commande.statut = nouveauStatut;
        if (this.commandeSelectionnee?.id === commande.id) {
          this.commandeSelectionnee.statut = nouveauStatut;
        }
        this.calculerStats();
        this.filtrer();
      }
      this.cdr.detectChanges();
    }).catch(() => {
      commande.statut = nouveauStatut;
      if (this.commandeSelectionnee?.id === commande.id) {
        this.commandeSelectionnee.statut = nouveauStatut;
      }
      this.calculerStats();
      this.filtrer();
      this.cdr.detectChanges();
    });
  }

  getLivreurNom(c: any): string {
    if (!c.livreur_id) return 'Aucun livreur assigné';
    if (c.livreur_prenom || c.livreur_nom) {
      return `${c.livreur_prenom || ''} ${c.livreur_nom || ''}`.trim();
    }
    const liv = this.livreurs.find(l => l.id === c.livreur_id);
    return liv ? `${liv.prenom} ${liv.nom}` : 'Livreur #' + c.livreur_id;
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

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/admin-login']);
  }
}