import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parametres',
  imports: [CommonModule, FormsModule],
  templateUrl: './parametres.html',
  styleUrl: './parametres.scss'
})
export class Parametres implements OnInit {

  admin: any = null;
  sidebarOpen = false;
  sectionActive = 'profil';
  modifie = false;
  saveSuccess = false;

  // PROFIL
  profil = {
    nom: '',
    email: '',
    telephone: '',
    ville: 'Dakar',
    description: ''
  };

  // HORAIRES
  horaires = [
    { jour: 'Lundi', ouvert: true, debut: '08:00', fin: '23:00' },
    { jour: 'Mardi', ouvert: true, debut: '08:00', fin: '23:00' },
    { jour: 'Mercredi', ouvert: true, debut: '08:00', fin: '23:00' },
    { jour: 'Jeudi', ouvert: true, debut: '08:00', fin: '23:00' },
    { jour: 'Vendredi', ouvert: true, debut: '08:00', fin: '00:00' },
    { jour: 'Samedi', ouvert: true, debut: '10:00', fin: '00:00' },
    { jour: 'Dimanche', ouvert: false, debut: '12:00', fin: '22:00' }
  ];

  // THÈME
  theme = 'dark';

  // LANGUE
  langue = 'fr';

  // NOTIFICATIONS
  notifications = {
    commandes: true,
    livraison: true,
    avis: true,
    rapports: false,
    stock: true
  };

  // PAIEMENTS
  paiements = {
    wave: true,
    orange_money: true,
    carte: true,
    especes: true
  };

  // SÉCURITÉ
  securite = {
    jwt_duree: '24h',
    double_auth: false,
    sessions_actives: 1,
    ip_whitelist: '',
    token: ''
  };

  // JOURNAL AUDIT
  journalAudit: any[] = [];

  // PASSWORD
  ancienMdp = '';
  nouveauMdp = '';
  confirmerMdp = '';
  erreurMdp = '';
  successMdp = '';
  loadingMdp = false;

  private apiUrl = environment.apiUrl;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerProfil();
    this.chargerPreferences();
    this.appliquerTheme();
    this.appliquerLangue();
    this.genererJournalAudit();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerProfil() {
    if (this.admin) {
      this.profil.nom = `${this.admin.prenom || ''} ${this.admin.nom || ''}`.trim();
      this.profil.email = this.admin.email || '';
      this.profil.telephone = this.admin.telephone || '';
    }
    this.securite.token = localStorage.getItem('token') || '';
  }

  chargerPreferences() {
    const prefs = localStorage.getItem('quickbite_prefs');
    if (prefs) {
      const p = JSON.parse(prefs);
      this.theme = p.theme || 'dark';
      this.langue = p.langue || 'fr';
      if (p.notifications) this.notifications = p.notifications;
      if (p.paiements) this.paiements = p.paiements;
      if (p.horaires) this.horaires = p.horaires;
    }
  }

  marquerModifie() {
    this.modifie = true;
    this.cdr.detectChanges();
  }

  // ══ THÈME ══
  changerTheme(t: string) {
    this.theme = t;
    this.marquerModifie();
    this.appliquerTheme();
  }

appliquerTheme() {
  const prefs = JSON.parse(localStorage.getItem('quickbite_prefs') || '{}');
  prefs.theme = this.theme;
  localStorage.setItem('quickbite_prefs', JSON.stringify(prefs));

  document.body.classList.remove('theme-dark', 'theme-light');

  if (this.theme === 'light') {
    document.body.classList.add('theme-light');
  } else if (this.theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
  } else {
    document.body.classList.add('theme-dark');
  }

  this.cdr.detectChanges();
}

  // ══ LANGUE ══
  changerLangue(lang: string) {
    this.langue = lang;
    this.marquerModifie();
    this.appliquerLangue();
  }

  appliquerLangue() {
    localStorage.setItem('quickbite_langue', this.langue);
    document.documentElement.lang = this.langue;
    this.cdr.detectChanges();
  }

  t(fr: string, en: string): string {
    return this.langue === 'en' ? en : fr;
  }

  // ══ ENREGISTRER ══
  enregistrer() {
    const token = localStorage.getItem('token');

    // Sauvegarder préférences localement
    const prefs = {
      theme: this.theme,
      langue: this.langue,
      notifications: this.notifications,
      paiements: this.paiements,
      horaires: this.horaires
    };
    localStorage.setItem('quickbite_prefs', JSON.stringify(prefs));

    // Mettre à jour le profil via API
    if (this.profil.email || this.profil.telephone) {
      fetch(`${this.apiUrl}/auth/profil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nom: this.profil.nom.split(' ').slice(-1)[0],
          prenom: this.profil.nom.split(' ')[0],
          telephone: this.profil.telephone,
          ville: this.profil.ville
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success || data.utilisateur) {
          if (data.utilisateur) {
            localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
            this.admin = data.utilisateur;
          }
        }
        this.cdr.detectChanges();
      }).catch(() => {});
    }

    this.modifie = false;
    this.saveSuccess = true;
    this.ajouterAudit('Paramètres sauvegardés', 'success');
    this.cdr.detectChanges();

    setTimeout(() => {
      this.saveSuccess = false;
      this.cdr.detectChanges();
    }, 3000);
  }

  annuler() {
    this.chargerPreferences();
    this.chargerProfil();
    this.modifie = false;
    this.appliquerTheme();
    this.cdr.detectChanges();
  }

  // ══ MOT DE PASSE ══
  changerMotDePasse() {
    this.erreurMdp = '';
    this.successMdp = '';

    if (!this.ancienMdp || !this.nouveauMdp) {
      this.erreurMdp = this.t('Veuillez remplir tous les champs', 'Please fill all fields');
      return;
    }

    if (this.nouveauMdp !== this.confirmerMdp) {
      this.erreurMdp = this.t('Les mots de passe ne correspondent pas', 'Passwords do not match');
      return;
    }

    if (this.nouveauMdp.length < 8) {
      this.erreurMdp = this.t('Minimum 8 caractères', 'Minimum 8 characters');
      return;
    }

    this.loadingMdp = true;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/auth/changer-mot-de-passe`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ancien_mot_de_passe: this.ancienMdp,
        nouveau_mot_de_passe: this.nouveauMdp
      })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingMdp = false;
      if (data.success) {
        this.successMdp = this.t('Mot de passe modifié avec succès !', 'Password changed successfully!');
        this.ancienMdp = '';
        this.nouveauMdp = '';
        this.confirmerMdp = '';
        this.ajouterAudit('Mot de passe modifié', 'security');
      } else {
        this.erreurMdp = data.message || this.t('Erreur lors du changement', 'Error changing password');
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingMdp = false;
      this.erreurMdp = this.t('Erreur de connexion', 'Connection error');
      this.cdr.detectChanges();
    });
  }

  // ══ JOURNAL AUDIT ══
  genererJournalAudit() {
    const now = new Date();
    this.journalAudit = [
      { action: 'Connexion administrateur', user: this.admin?.email, date: now.toLocaleString('fr-FR'), type: 'auth', icone: '🔐' },
      { action: 'Accès page Paramètres', user: this.admin?.email, date: now.toLocaleString('fr-FR'), type: 'nav', icone: '⚙️' },
      { action: 'Consultation avis clients', user: this.admin?.email, date: new Date(now.getTime() - 300000).toLocaleString('fr-FR'), type: 'view', icone: '⭐' },
      { action: 'Génération rapport revenus', user: this.admin?.email, date: new Date(now.getTime() - 600000).toLocaleString('fr-FR'), type: 'export', icone: '📄' },
      { action: 'Modification statut commande', user: this.admin?.email, date: new Date(now.getTime() - 900000).toLocaleString('fr-FR'), type: 'edit', icone: '📋' }
    ];

    const saved = localStorage.getItem('quickbite_audit');
    if (saved) {
      const savedAudit = JSON.parse(saved);
      this.journalAudit = [...savedAudit, ...this.journalAudit].slice(0, 20);
    }
  }

  ajouterAudit(action: string, type: string) {
    const icones: any = { success: '✅', security: '🔒', error: '❌', nav: '📍' };
    this.journalAudit.unshift({
      action,
      user: this.admin?.email,
      date: new Date().toLocaleString('fr-FR'),
      type,
      icone: icones[type] || '📝'
    });
    localStorage.setItem('quickbite_audit', JSON.stringify(this.journalAudit.slice(0, 20)));
    this.cdr.detectChanges();
  }

  copierToken() {
    navigator.clipboard.writeText(this.securite.token).then(() => {
      this.ajouterAudit('Token JWT copié', 'security');
    });
  }

  deconnecterSessions() {
    if (!confirm(this.t('Déconnecter toutes les sessions ?', 'Disconnect all sessions?'))) return;
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/admin-login']);
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  changerSection(s: string) {
    this.sectionActive = s;
    this.fermerSidebar();
    this.cdr.detectChanges();
  }

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