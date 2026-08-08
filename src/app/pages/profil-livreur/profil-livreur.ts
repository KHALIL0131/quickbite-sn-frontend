import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profil-livreur',
  imports: [CommonModule, FormsModule],
  templateUrl: './profil-livreur.html',
  styleUrl: './profil-livreur.scss'
})
export class ProfilLivreur implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;
  loadingSave = false;
  showEditForm = false;
  succes = '';
  erreur = '';
  sectionActive = 'profil';

  stats: any = {
    total_livraisons: 0,
    livrees: 0,
    annulees: 0,
    aujourd_hui: 0,
    gains_total: 0,
    gains_jour: 0
  };

  form = {
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
    ville: 'Dakar'
  };

  ancienMdp = '';
  nouveauMdp = '';
  confirmerMdp = '';
  erreurMdp = '';
  successMdp = '';

  private apiUrl = environment.apiUrl;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerStats();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
    this.form = {
      nom: this.livreur.nom || '',
      prenom: this.livreur.prenom || '',
      telephone: this.livreur.telephone || '',
      adresse: this.livreur.adresse || '',
      ville: this.livreur.ville || 'Dakar'
    };
  }

 chargerStats() {
  this.loading = true;
  const token = localStorage.getItem('token');

  const timeout = setTimeout(() => {
    this.loading = false;
    this.cdr.detectChanges();
  }, 3000);

  fetch(`${this.apiUrl}/livreur/statistiques`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    clearTimeout(timeout);
    if (data.success && data.data) {
      this.stats = {
        total_livraisons: data.data.total_livraisons || 0,
        livrees: data.data.livrees || 0,
        annulees: data.data.annulees || 0,
        aujourd_hui: data.data.aujourd_hui || 0,
        gains_total: data.data.gains_total || 0,
        gains_jour: data.data.gains_jour || 0
      };
    } else {
      this.stats = {
        total_livraisons: 0, livrees: 0,
        annulees: 0, aujourd_hui: 0,
        gains_total: 0, gains_jour: 0
      };
    }
    this.loading = false;
    this.cdr.detectChanges();
  }).catch(() => {
    clearTimeout(timeout);
    this.stats = {
      total_livraisons: 0, livrees: 0,
      annulees: 0, aujourd_hui: 0,
      gains_total: 0, gains_jour: 0
    };
    this.loading = false;
    this.cdr.detectChanges();
  });
}

  sauvegarderProfil() {
    this.loadingSave = true;
    this.erreur = '';
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/auth/profil`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(this.form)
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success || data.utilisateur) {
        const updated = data.utilisateur || { ...this.livreur, ...this.form };
        localStorage.setItem('utilisateur', JSON.stringify(updated));
        this.livreur = updated;
        this.showEditForm = false;
        this.succes = '✅ Profil mis à jour !';
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    }).catch(() => {
      this.loadingSave = false;
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
    });
  }

  changerMotDePasse() {
    this.erreurMdp = '';
    this.successMdp = '';
    if (!this.ancienMdp || !this.nouveauMdp) {
      this.erreurMdp = 'Remplissez tous les champs'; return;
    }
    if (this.nouveauMdp !== this.confirmerMdp) {
      this.erreurMdp = 'Les mots de passe ne correspondent pas'; return;
    }
    if (this.nouveauMdp.length < 8) {
      this.erreurMdp = 'Minimum 8 caractères'; return;
    }

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/auth/changer-mot-de-passe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ancien_mot_de_passe: this.ancienMdp,
        nouveau_mot_de_passe: this.nouveauMdp
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.successMdp = '✅ Mot de passe modifié !';
        this.ancienMdp = ''; this.nouveauMdp = ''; this.confirmerMdp = '';
      } else {
        this.erreurMdp = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    }).catch(() => { this.erreurMdp = 'Erreur de connexion'; this.cdr.detectChanges(); });
  }

  getTauxReussite(): number {
    if (!this.stats.total_livraisons) return 0;
    return Math.round(this.stats.livrees / this.stats.total_livraisons * 100);
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
      'carburant': '/carburant', 'entretien': '/entretien',
      'profil': '/profil-livreur', 'parametres': '/profil-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    if (!confirm('Se déconnecter ?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}