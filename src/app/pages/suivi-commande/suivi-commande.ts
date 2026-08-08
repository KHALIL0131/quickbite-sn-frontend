import { environment } from '../../../environments/environment';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-suivi-commande',
  imports: [CommonModule, FormsModule],
  templateUrl: './suivi-commande.html',
  styleUrl: './suivi-commande.scss'
})
export class SuiviCommande implements OnInit, OnDestroy {

  utilisateur: any = null;
  commande: any = null;
  loading = true;
  commandeId: string | null = null;

  // TIMER
  minutesRestantes = 28;
  secondesRestantes = 0;
  private timer: any;
  private refreshTimer: any;

  // NOTATION
  showNoteModal = false;
  noteSelectionnee = 0;
  noteCommentaire = '';
  noteEnvoyee = false;

  // PROBLÈME
  showProblemeModal = false;
  problemeTexte = '';
  problemeEnvoye = false;

  // ÉTAPES TIMELINE
  etapes = [
    { id: 1, icon: '✓', label: 'Commande confirmée', desc: 'Le restaurant a accepté votre commande', statut: 'done', heure: '' },
    { id: 2, icon: '✓', label: 'En préparation', desc: 'Le restaurant prépare vos plats', statut: 'pending', heure: '' },
    { id: 3, icon: '✓', label: 'Prête · Récupérée', desc: 'Le livreur a récupéré votre commande', statut: 'pending', heure: '' },
    { id: 4, icon: '🛵', label: 'En livraison', desc: 'Le livreur est en route vers vous', statut: 'pending', heure: '' },
    { id: 5, icon: '📦', label: 'Livré', desc: 'Votre commande a été livrée', statut: 'pending', heure: '' }
  ];

  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.route.queryParams.subscribe(params => {
      this.commandeId = params['commande_id'];
      if (this.commandeId) this.chargerCommande();
      else this.loading = false;
    });
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (user) this.utilisateur = JSON.parse(user);
  }

  chargerCommande() {
    this.loading = true;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${this.commandeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.commande = data.data;
        this.mettreAJourEtapes();
        this.calculerTemps();
        this.demarrerTimer();
        this.demarrerRefresh();
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  mettreAJourEtapes() {
    if (!this.commande) return;
    const statut = this.commande.statut;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const created = new Date(this.commande.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Reset
    this.etapes.forEach(e => { e.statut = 'pending'; e.heure = ''; });

    // Étape 1 toujours done
    this.etapes[0].statut = 'done';
    this.etapes[0].heure = created;

    if (['preparation', 'en_livraison', 'livree'].includes(statut)) {
      this.etapes[1].statut = 'done';
      this.etapes[1].heure = created;
    }
    if (['en_livraison', 'livree'].includes(statut)) {
      this.etapes[2].statut = 'done';
      this.etapes[2].heure = now;
    }
    if (statut === 'en_livraison') {
      this.etapes[3].statut = 'active';
      this.etapes[3].heure = now + ' · Maintenant';
    }
    if (statut === 'livree') {
      this.etapes[3].statut = 'done';
      this.etapes[4].statut = 'done';
      this.etapes[4].heure = now;
    }
    if (statut === 'nouvelle') {
      this.etapes[0].statut = 'active';
    }
    if (statut === 'preparation') {
      this.etapes[1].statut = 'active';
    }

    this.cdr.detectChanges();
  }

  calculerTemps() {
    if (!this.commande) return;
    const statuts: any = {
      'nouvelle': 30, 'preparation': 20,
      'en_livraison': 10, 'livree': 0
    };
    this.minutesRestantes = statuts[this.commande.statut] || 28;
    this.secondesRestantes = 0;
  }

  demarrerTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.secondesRestantes > 0) {
        this.secondesRestantes--;
      } else if (this.minutesRestantes > 0) {
        this.minutesRestantes--;
        this.secondesRestantes = 59;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  demarrerRefresh() {
    this.refreshTimer = setInterval(() => {
      if (this.commandeId) this.chargerCommande();
    }, 30000); // Refresh toutes les 30s
  }

  // NOTATION
  noterCommande() {
    if (this.noteSelectionnee === 0) return;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/avis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        restaurant_id: this.commande?.restaurant_id,
        commande_id: this.commande?.id,
        note: this.noteSelectionnee,
        commentaire: this.noteCommentaire
      })
    })
    .then(res => res.json())
    .then(() => {
      this.noteEnvoyee = true;
      setTimeout(() => { this.showNoteModal = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    }).catch(() => {
      this.noteEnvoyee = true;
      setTimeout(() => { this.showNoteModal = false; this.cdr.detectChanges(); }, 2000);
      this.cdr.detectChanges();
    });
  }

  // PROBLÈME
  signalerProbleme() {
    if (!this.problemeTexte.trim()) return;
    this.problemeEnvoye = true;
    setTimeout(() => { this.showProblemeModal = false; this.cdr.detectChanges(); }, 2000);
    this.cdr.detectChanges();
  }

  // APPEL LIVREUR
  appelerLivreur() {
    const tel = this.commande?.livreur_telephone;
    if (tel) window.open(`tel:${tel}`);
    else alert('Numéro du livreur non disponible');
  }

  // WHATSAPP LIVREUR
  chatLivreur() {
    const tel = this.commande?.livreur_telephone?.replace('+', '') || '221776543210';
    const msg = encodeURIComponent(`Bonjour, je suis ${this.utilisateur?.prenom} ${this.utilisateur?.nom}. Je voulais avoir des informations sur ma commande #${this.commande?.numero}`);
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
  }

  // ANNULER
  annulerCommande() {
    if (!confirm('Annuler cette commande ?')) return;
    if (!['nouvelle', 'preparation'].includes(this.commande?.statut)) {
      alert('Cette commande ne peut plus être annulée car elle est déjà en livraison.');
      return;
    }
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${this.commandeId}/statut`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ statut: 'annulee' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.commande.statut = 'annulee';
        this.mettreAJourEtapes();
        alert('Commande annulée avec succès.');
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  get etapesActive() {
    return this.etapes.filter(e => e.statut !== 'pending');
  }

  get progression(): number {
    const map: any = { 'nouvelle': 10, 'preparation': 35, 'en_livraison': 75, 'livree': 100, 'annulee': 0 };
    return map[this.commande?.statut] || 0;
  }

  get estLivree(): boolean { return this.commande?.statut === 'livree'; }
  get estAnnulee(): boolean { return this.commande?.statut === 'annulee'; }
  get peutAnnuler(): boolean { return ['nouvelle', 'preparation'].includes(this.commande?.statut); }

  getInitialesLivreur(): string {
    const nom = this.commande?.livreur_nom || '';
    return nom.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'L';
  }

  getInitiales(): string {
    if (!this.utilisateur) return '?';
    return ((this.utilisateur.prenom?.[0] || '') + (this.utilisateur.nom?.[0] || '')).toUpperCase();
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  padZero(n: number): string { return n < 10 ? '0' + n : '' + n; }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToPanier() { this.router.navigate(['/panier']); }
  goToHistorique() { this.router.navigate(['/historique-commandes']); }
}