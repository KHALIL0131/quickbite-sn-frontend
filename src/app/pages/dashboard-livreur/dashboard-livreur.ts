import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-dashboard-livreur',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-livreur.html',
  styleUrl: './dashboard-livreur.scss'
})
export class DashboardLivreur implements OnInit, OnDestroy {

  livreur: any = null;
  estEnLigne = true;
  dateAujourdhui = '';
  loading = true;
  sidebarOpen = false;

  kpis = {
    livraisons: 0,
    gains: 0,
    note: '—' as any,
    tempsMovyen: '—' as any
  };

  // ══ ALERTE COMMANDE ASSIGNÉE ══
  nouvelleCommande: any = null;
  showAlerte = false;
  sonAlerte = false;

  // ══ NOTIFICATIONS ══
  notifications: any[] = [];
  notifsNonLues = 0;
  showNotifs = false;

  livraisons: any[] = [];
  livraisonsFiltrees: any[] = [];
  filtreActif = 'toutes';

  gainsSemaine = [
    { jour: 'Lun', pct: 0, actif: false },
    { jour: 'Mar', pct: 0, actif: false },
    { jour: 'Mer', pct: 0, actif: false },
    { jour: 'Jeu', pct: 0, actif: false },
    { jour: 'Ven', pct: 0, actif: false },
    { jour: 'Sam', pct: 0, actif: false },
    { jour: 'Dim', pct: 0, actif: false }
  ];

  totalGainsSemaine = 0;

  get stats_encours(): number {
    return this.livraisons.filter(c =>
      ['nouvelle', 'preparation', 'en_livraison'].includes(c.statut)
    ).length;
  }

  private socket!: Socket;
  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.setDate();
    this.marquerJourActif();
    this.connecterSocket();
    this.chargerDonnees();
    this.chargerNotifications();
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

  setDate() {
    const now = new Date();
    this.dateAujourdhui = now.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  marquerJourActif() {
    const jourJs = new Date().getDay();
    const map: any = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
    const idx = map[jourJs];
    this.gainsSemaine.forEach((g, i) => g.actif = (i === idx));
  }

  // ══ SOCKET.IO ══
  connecterSocket() {
    this.socket = io('http://localhost:3000', { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      if (this.livreur) {
        this.socket.emit('rejoindre', this.livreur.id);
        console.log('✅ Livreur connecté au temps réel');
      }
    });

    this.socket.on('commande_assignee', (commande: any) => {
      this.nouvelleCommande = commande;
      this.showAlerte = true;
      this.sonAlerte = true;
      this.jouerSon();

      this.notifications.unshift({
        id: Date.now(),
        commande_id: commande.id,
        titre: '🛵 Nouvelle livraison assignée',
        message: `Commande #${commande.numero} · ${commande.client_prenom || ''} ${commande.client_nom || ''}`,
        type: 'livraison',
        est_lu: 0,
        created_at: new Date()
      });
      this.notifsNonLues++;

      this.cdr.detectChanges();
      setTimeout(() => this.chargerDonnees(), 800);
      setTimeout(() => { this.sonAlerte = false; this.cdr.detectChanges(); }, 3000);
    });
  }

  jouerSon() {
    try {
      const ctx = new (window as any).AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  }

  // ══ NOTIFICATIONS ══
  chargerNotifications() {
    if (!this.livreur) return;
    fetch(`${this.apiUrl}/notifications/${this.livreur.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.notifications = data.data || [];
          this.notifsNonLues = data.non_lus || 0;
        }
        this.cdr.detectChanges();
      }).catch(() => {});
  }

  toggleNotifs() {
    this.showNotifs = !this.showNotifs;
    if (this.showNotifs && this.notifsNonLues > 0) {
      fetch(`${this.apiUrl}/notifications/${this.livreur.id}/lues`, { method: 'PUT' })
        .then(() => {
          this.notifsNonLues = 0;
          this.notifications.forEach(n => n.est_lu = 1);
          this.cdr.detectChanges();
        }).catch(() => {});
    }
    this.cdr.detectChanges();
  }

  // ══ CLIQUER SUR UNE NOTIFICATION → ROUVRIR L'ALERTE ══
  ouvrirNotification(n: any) {
    this.showNotifs = false;

    // Retrouver la commande liée
    let cmd = null;
    if (n.commande_id) {
      cmd = this.livraisons.find(c => c.id === n.commande_id);
    }
    if (!cmd) {
      // Extraire le numéro depuis le message
      const match = (n.message || '').match(/#([A-Za-z0-9\-]+)/);
      if (match) {
        cmd = this.livraisons.find(c => c.numero === match[1]);
      }
    }
    if (!cmd) {
      cmd = this.livraisons.find(c => c.statut === 'en_livraison');
    }

    if (cmd) {
      this.nouvelleCommande = cmd;
      this.showAlerte = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.router.navigate(['/mes-livraisons']);
    }
    this.cdr.detectChanges();
  }

  // ══ CHARGEMENT ══
  chargerDonnees() {
    this.loading = true;
    const token = localStorage.getItem('token');

    const timeout = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 6000);

    fetch(`${this.apiUrl}/livreur/mes-livraisons`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeout);
      if (data.success) {
        const toutes = (data.data || []).filter((c: any) =>
          c.livreur_id === this.livreur.id
        );

        const today = new Date().toDateString();

        this.livraisons = toutes.filter((c: any) =>
          new Date(c.created_at).toDateString() === today
        );

        const livreesJour = this.livraisons.filter((c: any) => c.statut === 'livree');
        this.kpis.livraisons = livreesJour.length;
        this.kpis.gains = livreesJour.reduce((s: number, c: any) =>
          s + this.getGainLivraison(c), 0);

        const totalLivrees = toutes.filter((c: any) => c.statut === 'livree');
        this.kpis.note = totalLivrees.length > 0 ? '5.0' : '—';
        this.kpis.tempsMovyen = totalLivrees.length > 0 ? '25 min' : '—';

        this.totalGainsSemaine = totalLivrees.reduce((s: number, c: any) =>
          s + this.getGainLivraison(c), 0);

        this.gainsSemaine.forEach(g => g.pct = 0);
        const parJour: any = {};
        totalLivrees.forEach((c: any) => {
          const d = new Date(c.created_at);
          const jourIndex = d.getDay();
          if (!parJour[jourIndex]) parJour[jourIndex] = 0;
          parJour[jourIndex] += this.getGainLivraison(c);
        });
        const valeurs = Object.values(parJour) as number[];
        const maxGain = valeurs.length > 0 ? Math.max(...valeurs, 1) : 1;
        const joursMap: any = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
        Object.keys(parJour).forEach(jour => {
          const idx = joursMap[parseInt(jour)];
          if (idx !== undefined) {
            this.gainsSemaine[idx].pct = Math.round((parJour[parseInt(jour)] / maxGain) * 100);
          }
        });

        // Alerte : course assignée non encore acceptée
        const acceptees = JSON.parse(localStorage.getItem('courses_acceptees') || '[]');
        const aTraiter = toutes.filter((c: any) =>
          c.statut === 'en_livraison' && !acceptees.includes(c.id)
        );

        if (aTraiter.length > 0 && !this.showAlerte) {
          this.nouvelleCommande = aTraiter[0];
          this.showAlerte = true;
        }

        this.filtrerLivraisons();
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  filtrerLivraisons() {
    if (this.filtreActif === 'terminees') {
      this.livraisonsFiltrees = this.livraisons.filter(c => c.statut === 'livree');
    } else if (this.filtreActif === 'encours') {
      this.livraisonsFiltrees = this.livraisons.filter(c =>
        ['en_livraison', 'nouvelle', 'preparation'].includes(c.statut)
      );
    } else {
      this.livraisonsFiltrees = [...this.livraisons];
    }
    this.cdr.detectChanges();
  }

  setFiltre(f: string) {
    this.filtreActif = f;
    this.filtrerLivraisons();
  }

  // ══ ACCEPTER — ferme l'alerte ══
  accepterCommande() {
    if (!this.nouvelleCommande) return;

    const acceptees = JSON.parse(localStorage.getItem('courses_acceptees') || '[]');
    if (!acceptees.includes(this.nouvelleCommande.id)) {
      acceptees.push(this.nouvelleCommande.id);
      localStorage.setItem('courses_acceptees', JSON.stringify(acceptees));
    }

    this.socket.emit('accepter_livraison', {
      commande_id: this.nouvelleCommande.id,
      livreur_id: this.livreur.id,
      client_id: this.nouvelleCommande.client_id,
      livreur_nom: `${this.livreur.prenom} ${this.livreur.nom}`
    });

    this.showAlerte = false;
    this.nouvelleCommande = null;
    this.cdr.detectChanges();
    this.chargerDonnees();
  }

  // ══ PLUS TARD — ferme l'alerte sans accepter ══
  refuserCommande() {
    this.showAlerte = false;
    this.cdr.detectChanges();
  }

  // ══ CARTE — NE ferme PAS l'alerte ══
  voirSurCarte() {
    this.router.navigate(['/carte-livreur']);
  }

  // ══ CONTACTER — NE ferme PAS l'alerte ══
  contacterClient() {
    this.router.navigate(['/messagerie-livreur']);
  }

  // ══ MARQUER LIVRÉE ══
  marquerLivree(c: any, event: Event) {
    event.stopPropagation();
    if (!confirm(`Confirmer la livraison de la commande #${c.numero} ?`)) return;

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${c.id}/statut`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ statut: 'livree' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        c.statut = 'livree';
        this.chargerDonnees();
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  toggleStatut() {
    this.estEnLigne = !this.estEnLigne;
    this.cdr.detectChanges();
  }

  voirCommande(c: any) {
    this.router.navigate(['/suivi-commande'], {
      queryParams: { commande_id: c.id }
    });
  }

  // ══ GAIN : frais de livraison de la zone ══
  getGainLivraison(c: any): number {
    if (!c) return 0;
    return Math.round(parseFloat(c.frais_livraison) || 0);
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'nouvelle': 'sb-pending',
      'preparation': 'sb-pending',
      'en_livraison': 'sb-transit',
      'livree': 'sb-done',
      'annulee': 'sb-cancel'
    };
    return map[statut] || 'sb-pending';
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'nouvelle': '🆕 Nouvelle',
      'preparation': '👨‍🍳 Préparation',
      'en_livraison': '🛵 En livraison',
      'livree': '✅ Livré',
      'annulee': '✗ Annulé'
    };
    return map[statut] || statut;
  }

  getInitiales(): string {
    if (!this.livreur) return 'L';
    return ((this.livreur.prenom?.[0] || '') + (this.livreur.nom?.[0] || '')).toUpperCase();
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  formaterHeure(d: any): string {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-livreur',
      'livraisons': '/mes-livraisons',
      'historique': '/historique-livreur',
      'gains': '/gains-livreur',
      'carte': '/carte-livreur',
      'messagerie': '/messagerie-livreur',
      'moto': '/mon-moto',
      'carburant': '/carburant',
      'entretien': '/entretien',
      'profil': '/profil-livreur',
      'parametres': '/profil-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    if (this.socket) this.socket.disconnect();
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}