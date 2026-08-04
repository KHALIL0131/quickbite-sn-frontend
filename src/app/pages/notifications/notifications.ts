import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications implements OnInit {

  admin: any = null;
  sidebarOpen = false;
  ongletActif = 'toutes';

  notifications: any[] = [];
  notificationsFiltrees: any[] = [];
  loading = true;

  // STATS
  stats = { commandes: 0, livrees: 0, enCours: 0, annulees: 0 };

  // PRÉFÉRENCES
  prefs = {
    commandes: true,
    livraisons: true,
    avis: true,
    alertes: true,
    email: false
  };

  // TOAST
  toastNotif: any = null;

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerNotifications();
    this.chargerStats();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerNotifications() {
    this.loading = true;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/commandes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        // Générer notifications depuis commandes
        this.notifications = data.data.slice(0, 10).map((c: any, i: number) => ({
          id: c.id,
          type: c.statut === 'nouvelle' ? 'order' :
                c.statut === 'livree' ? 'delivery' :
                c.statut === 'annulee' ? 'alert' : 'system',
          titre: c.statut === 'nouvelle' ? `🆕 Nouvelle commande · #${c.numero}` :
                 c.statut === 'livree' ? `✅ Commande #${c.numero} livrée` :
                 c.statut === 'en_livraison' ? `🛵 Commande #${c.numero} en livraison` :
                 c.statut === 'annulee' ? `❌ Commande #${c.numero} annulée` :
                 `🍳 Commande #${c.numero} en préparation`,
          texte: `${c.client_nom || 'Client'} · ${this.formaterMontant(c.montant_total)} · ${c.mode_paiement}`,
          temps: this.tempsRelatif(c.created_at),
          lu: i > 2,
          commande_id: c.id,
          statut: c.statut
        }));
        this.filtrer();

        // Toast de la dernière notification
        if (this.notifications.length > 0 && !this.notifications[0].lu) {
          this.toastNotif = this.notifications[0];
          setTimeout(() => { this.toastNotif = null; this.cdr.detectChanges(); }, 5000);
        }
      }
      this.loading = false;
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  chargerStats() {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/utilisateurs/statistiques`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.stats.commandes = data.data.commandes;
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  filtrer() {
    if (this.ongletActif === 'toutes') {
      this.notificationsFiltrees = [...this.notifications];
    } else if (this.ongletActif === 'non-lues') {
      this.notificationsFiltrees = this.notifications.filter(n => !n.lu);
    } else if (this.ongletActif === 'commandes') {
      this.notificationsFiltrees = this.notifications.filter(n => n.type === 'order');
    } else if (this.ongletActif === 'alertes') {
      this.notificationsFiltrees = this.notifications.filter(n => n.type === 'alert');
    }
    this.cdr.detectChanges();
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
    this.filtrer();
  }

  marquerLu(notif: any) {
    notif.lu = true;
    this.cdr.detectChanges();
  }

  toutMarquerLu() {
    this.notifications.forEach(n => n.lu = true);
    this.filtrer();
  }

  effacerTout() {
    if (confirm('Effacer toutes les notifications ?')) {
      this.notifications = [];
      this.notificationsFiltrees = [];
      this.cdr.detectChanges();
    }
  }

  fermerToast() {
    this.toastNotif = null;
    this.cdr.detectChanges();
  }

  getIconClass(type: string): string {
    const map: any = {
      'order': 'ni-order',
      'delivery': 'ni-delivery',
      'review': 'ni-review',
      'system': 'ni-system',
      'alert': 'ni-alert',
      'promo': 'ni-promo'
    };
    return map[type] || 'ni-system';
  }

  getIconEmoji(type: string): string {
    const map: any = {
      'order': '📦',
      'delivery': '🛵',
      'review': '⭐',
      'system': '🔔',
      'alert': '⚠️',
      'promo': '🎁'
    };
    return map[type] || '🔔';
  }

  get nonLuesCount() {
    return this.notifications.filter(n => !n.lu).length;
  }

  tempsRelatif(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const heures = Math.floor(diff / 3600000);
    const jours = Math.floor(diff / 86400000);
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (heures < 24) return `Il y a ${heures}h`;
    return `Il y a ${jours}j`;
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  voirCommande(id: number) {
    this.router.navigate(['/gestion-commandes']);
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