import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profil-client',
  imports: [CommonModule, FormsModule],
  templateUrl: './profil-client.html',
  styleUrl: './profil-client.scss'
})
export class ProfilClient implements OnInit {

  utilisateur: any = null;
  sectionActive = 'commandes';
  loading = true;
  loadingSave = false;
  erreur = '';
  succes = '';

  // COMMANDES
  commandes: any[] = [];
  loadingCommandes = true;

  // FAVORIS (localStorage)
  favoris: any[] = [];

  // ADRESSES
  adresses: any[] = [
    { id: 1, nom: 'Domicile', icon: '🏠', detail: 'Dakar, Plateau', defaut: true },
    { id: 2, nom: 'Bureau', icon: '💼', detail: 'UNCHK, Dakar', defaut: false }
  ];

  // PAIEMENTS
  paiements = [
    { id: 1, emoji: '📱', nom: 'Wave', detail: 'Paiement mobile Wave', defaut: true },
    { id: 2, emoji: '🟠', nom: 'Orange Money', detail: 'Paiement mobile OM', defaut: false },
    { id: 3, emoji: '💵', nom: 'Espèces', detail: 'Paiement à la livraison', defaut: false }
  ];

  // FORMULAIRE EDIT
  showEdit = false;
  editForm = { nom: '', prenom: '', telephone: '', ville: 'Dakar', adresse: '' };

  // SÉCURITÉ
  ancienMdp = '';
  nouveauMdp = '';
  confirmerMdp = '';
  erreurMdp = '';
  successMdp = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.chargerCommandes();
    this.chargerFavoris();
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.utilisateur = JSON.parse(user);
    this.editForm = {
      nom: this.utilisateur.nom || '',
      prenom: this.utilisateur.prenom || '',
      telephone: this.utilisateur.telephone || '',
      ville: this.utilisateur.ville || 'Dakar',
      adresse: this.utilisateur.adresse || ''
    };
    this.loading = false;
    this.cdr.detectChanges();
  }

  chargerCommandes() {
    this.loadingCommandes = true;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/mes-commandes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) this.commandes = data.data;
      this.loadingCommandes = false;
      this.cdr.detectChanges();
    }).catch(() => { this.loadingCommandes = false; this.cdr.detectChanges(); });
  }

  chargerFavoris() {
    const favs = localStorage.getItem('quickbite_favoris');
    if (favs) this.favoris = JSON.parse(favs);
    this.cdr.detectChanges();
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
      body: JSON.stringify(this.editForm)
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success || data.utilisateur) {
        const updated = data.utilisateur || { ...this.utilisateur, ...this.editForm };
        localStorage.setItem('utilisateur', JSON.stringify(updated));
        this.utilisateur = updated;
        this.showEdit = false;
        this.succes = 'Profil mis à jour avec succès !';
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur lors de la mise à jour';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingSave = false;
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
    });
  }

  changerMotDePasse() {
    this.erreurMdp = '';
    this.successMdp = '';
    if (!this.ancienMdp || !this.nouveauMdp) { this.erreurMdp = 'Remplissez tous les champs'; return; }
    if (this.nouveauMdp !== this.confirmerMdp) { this.erreurMdp = 'Les mots de passe ne correspondent pas'; return; }
    if (this.nouveauMdp.length < 8) { this.erreurMdp = 'Minimum 8 caractères'; return; }

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/auth/changer-mot-de-passe`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ancien_mot_de_passe: this.ancienMdp, nouveau_mot_de_passe: this.nouveauMdp })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.successMdp = 'Mot de passe modifié !';
        this.ancienMdp = ''; this.nouveauMdp = ''; this.confirmerMdp = '';
      } else {
        this.erreurMdp = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    }).catch(() => { this.erreurMdp = 'Erreur de connexion'; this.cdr.detectChanges(); });
  }

  recommander(commande: any) {
    if (!commande.details) return;
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

  supprimerFavori(fav: any) {
    this.favoris = this.favoris.filter(f => f.id !== fav.id);
    localStorage.setItem('quickbite_favoris', JSON.stringify(this.favoris));
    this.cdr.detectChanges();
  }

  supprimerAdresse(addr: any) {
    if (!confirm('Supprimer cette adresse ?')) return;
    this.adresses = this.adresses.filter(a => a.id !== addr.id);
    this.cdr.detectChanges();
  }

  ajouterAdresse() {
    const detail = prompt('Entrez votre adresse complète :');
    if (!detail) return;
    this.adresses.push({ id: Date.now(), nom: 'Nouvelle adresse', icon: '📍', detail, defaut: false });
    this.cdr.detectChanges();
  }

  getStatutClass(statut: string): string {
    const map: any = {
      'livree': 'ois-done',
      'annulee': 'ois-cancel',
      'nouvelle': 'ois-new',
      'preparation': 'ois-prep',
      'en_livraison': 'ois-livr'
    };
    return map[statut] || 'ois-new';
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'livree': '✅ Livré',
      'annulee': '✗ Annulé',
      'nouvelle': '🆕 Nouvelle',
      'preparation': '👨‍🍳 En préparation',
      'en_livraison': '🛵 En livraison'
    };
    return map[statut] || statut;
  }

  getInitiales(): string {
    if (!this.utilisateur) return '?';
    return ((this.utilisateur.prenom?.[0] || '') + (this.utilisateur.nom?.[0] || '')).toUpperCase();
  }

  getTotalDepense(): number {
    return this.commandes
      .filter(c => c.statut === 'livree')
      .reduce((s, c) => s + (c.montant_total || 0), 0);
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  deconnecter() {
    if (!confirm('Se déconnecter ?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/accueil']);
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToPanier() { this.router.navigate(['/panier']); }
  goToHistorique() { this.router.navigate(['/historique-commandes']); }

  goToMessagerie() { this.router.navigate(['/messagerie']); }
}