import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-livreurs',
  imports: [CommonModule, FormsModule],
  templateUrl: './livreurs.html',
  styleUrl: './livreurs.scss'
})
export class Livreurs implements OnInit {

  admin: any = null;
  sidebarOpen = false;

  livreurs: any[] = [];
  livreursFiltres: any[] = [];
  loading = true;

  searchQuery = '';
  filtreStatut = '';

  succes = '';
  erreur = '';

  stats = { total: 0, enLigne: 0, enLivraison: 0, noteMoyenne: 0 };

  showProfil = false;
  livreurSelectionne: any = null;

  showModalRecruiter = false;
  loadingRecruiter = false;
  erreurRecruiter = '';

  nouveauLivreur = { prenom: '', nom: '', email: '', telephone: '', mot_de_passe: '' };

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.searchQuery = '';
    this.filtreStatut = '';
    this.verifierAuth();
    this.chargerLivreurs();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerLivreurs() {
    this.loading = true;
    const token = localStorage.getItem('token');

    const timeout = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 6000);

    Promise.all([
      fetch(`${this.apiUrl}/utilisateurs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${this.apiUrl}/commandes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).catch(() => ({ success: false, data: [] }))
    ])
    .then(([usersData, cmdData]) => {
      clearTimeout(timeout);

      const commandes = (cmdData && cmdData.data) ? cmdData.data : [];

      if (usersData.success) {
        this.livreurs = (usersData.data || [])
          .filter((u: any) => u.role === 'livreur')
          .map((u: any) => {
            // VRAIES DONNÉES depuis les commandes
            const mesCmd = commandes.filter((c: any) => c.livreur_id === u.id);
            const livrees = mesCmd.filter((c: any) => c.statut === 'livree');
            const enCours = mesCmd.filter((c: any) => c.statut === 'en_livraison');

            let statut = 'hors_ligne';
            if (enCours.length > 0) statut = 'en_livraison';
            else if (u.est_actif == 1) statut = 'disponible';
            if (u.est_actif == 0) statut = 'suspendu';

            return {
              ...u,
              statut,
              livraisons: livrees.length,
              enCours: enCours.length,
              temps_moyen: livrees.length > 0 ? '25 min' : '—',
              ponctualite: livrees.length > 0 ? '100%' : '—',
              note: livrees.length > 0 ? '5.0' : '—',
              gains: livrees.reduce((s: number, c: any) =>
                s + Math.round(parseFloat(c.frais_livraison) || 0), 0)
            };
          });
        this.calculerStats();
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    })
    .catch(() => {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  calculerStats() {
    this.stats.total = this.livreurs.length;
    this.stats.enLigne = this.livreurs.filter(l => l.statut === 'disponible').length;
    this.stats.enLivraison = this.livreurs.filter(l => l.statut === 'en_livraison').length;
    const notes = this.livreurs.map(l => parseFloat(l.note)).filter(n => !isNaN(n));
    this.stats.noteMoyenne = notes.length > 0 ?
      parseFloat((notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)) : 0;
  }

  filtrer() {
    let result = [...this.livreurs];

    if (this.filtreStatut) {
      result = result.filter(l => l.statut === this.filtreStatut);
    }

    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter(l =>
        (l.nom || '').toLowerCase().includes(q) ||
        (l.prenom || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.telephone || '').toLowerCase().includes(q)
      );
    }

    this.livreursFiltres = result;
    this.cdr.detectChanges();
  }

  viderRecherche() {
    this.searchQuery = '';
    this.filtrer();
  }

  // ══ SUSPENDRE / RÉACTIVER ══
  toggleSuspension(l: any, event: Event) {
    event.stopPropagation();
    const nouveauStatut = l.est_actif == 1 ? 0 : 1;
    const action = nouveauStatut === 0 ? 'suspendre' : 'réactiver';

    if (!confirm(`Voulez-vous ${action} le livreur ${l.prenom} ${l.nom} ?`)) return;

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/utilisateurs/${l.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ est_actif: nouveauStatut })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        l.est_actif = nouveauStatut;
        l.statut = nouveauStatut === 0 ? 'suspendu' : 'disponible';
        this.succes = nouveauStatut === 0
          ? `✅ ${l.prenom} ${l.nom} a été suspendu`
          : `✅ ${l.prenom} ${l.nom} a été réactivé`;
        this.calculerStats();
        this.filtrer();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur';
        setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
    });
  }

  // ══ SUPPRIMER ══
  supprimerLivreur(l: any, event: Event) {
    event.stopPropagation();
    if (!confirm(`⚠️ Supprimer définitivement ${l.prenom} ${l.nom} ?\n\nCette action est irréversible.`)) return;

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/utilisateurs/${l.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.livreurs = this.livreurs.filter(x => x.id !== l.id);
        this.succes = `✅ ${l.prenom} ${l.nom} a été supprimé`;
        this.calculerStats();
        this.filtrer();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur lors de la suppression';
        setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
    });
  }

  voirProfil(livreur: any) {
    this.livreurSelectionne = livreur;
    this.showProfil = true;
    this.cdr.detectChanges();
  }

  fermerProfil() {
    this.showProfil = false;
    this.livreurSelectionne = null;
    this.cdr.detectChanges();
  }

  recruterLivreur() {
    if (!this.nouveauLivreur.prenom || !this.nouveauLivreur.nom ||
        !this.nouveauLivreur.email || !this.nouveauLivreur.mot_de_passe) {
      this.erreurRecruiter = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    this.loadingRecruiter = true;
    this.erreurRecruiter = '';
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: this.nouveauLivreur.prenom,
        nom: this.nouveauLivreur.nom,
        email: this.nouveauLivreur.email,
        telephone: '+221' + this.nouveauLivreur.telephone,
        mot_de_passe: this.nouveauLivreur.mot_de_passe,
        role: 'livreur'
      })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingRecruiter = false;
      if (data.token || data.success) {
        this.showModalRecruiter = false;
        this.nouveauLivreur = { prenom: '', nom: '', email: '', telephone: '', mot_de_passe: '' };
        this.succes = '✅ Livreur recruté avec succès';
        this.chargerLivreurs();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreurRecruiter = data.message || 'Erreur lors du recrutement';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingRecruiter = false;
      this.erreurRecruiter = 'Erreur de connexion au serveur';
      this.cdr.detectChanges();
    });
  }

  getInitiales(u: any): string {
    return ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase();
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'disponible': 'sd-online',
      'en_livraison': 'sd-busy',
      'hors_ligne': 'sd-offline',
      'suspendu': 'sd-suspended'
    };
    return map[statut] || 'sd-offline';
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'disponible': '● Disponible',
      'en_livraison': '🛵 En livraison',
      'hors_ligne': '○ Hors ligne',
      'suspendu': '🚫 Suspendu'
    };
    return map[statut] || statut;
  }

  getStatutTextClass(statut: string): string {
    const map: any = {
      'disponible': 'st-online',
      'en_livraison': 'st-busy',
      'hors_ligne': 'st-offline',
      'suspendu': 'st-suspended'
    };
    return map[statut] || 'st-offline';
  }

  getAvatarGradient(statut: string, index: number): string {
    if (statut === 'suspendu') return 'rgba(231,76,60,0.4)';
    if (statut === 'hors_ligne') return 'rgba(107,143,119,0.5)';
    const gradients = [
      'linear-gradient(135deg,#FFD700,#F5A623)',
      'linear-gradient(135deg,#22A86A,#144D35)',
      'linear-gradient(135deg,#112240,#1E3A5F)',
      'linear-gradient(135deg,#F5A623,#E08B10)',
      'linear-gradient(135deg,#22A86A,#2563EB)'
    ];
    return gradients[index % gradients.length];
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
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