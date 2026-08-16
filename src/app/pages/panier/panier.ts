import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { PanierStore } from '../../services/panier.store';
import { AuthStore } from '../../services/auth.store';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-panier',
  imports: [CommonModule, FormsModule],
  templateUrl: './panier.html',
  styleUrl: './panier.scss'
})
export class Panier implements OnInit {

  // ══ STORES ══
  public panierStore = inject(PanierStore);
  public authStore = inject(AuthStore);
  private api = inject(ApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loadingCommande = false;
  erreur = '';
  succes = '';

  // CODE PROMO
  codePromo = '';
  promoAppliquee = false;
  promoReduction = 0;
  promoMessage = '';

  // LIVRAISON
  modeLivraison = 'domicile';
  adresseLivraison = '';

  // ZONES
  zones: any[] = [];
  zoneChoisie: any = '';
  zoneActive: any = null;
  loadingZones = true;

  zoneNonListee = false;
  quartierSaisi = '';

  // PAIEMENT
  modePaiement = 'especes';

  whatsappNumero = '+221773588475';

  ngOnInit() {
    this.chargerUtilisateur();
    this.chargerZones();
  }

  // ══ UTILISATEUR — via le store ══
  get utilisateur() {
    return this.authStore.utilisateur();
  }

  chargerUtilisateur() {
    const u = this.authStore.utilisateur();
    if (u) this.adresseLivraison = u.adresse || '';
  }

  // ══ PANIER — via le store ══
  get items() {
    return this.panierStore.articles();
  }

  get restaurants() {
    return this.panierStore.restaurants();
  }

  get sousTotal(): number {
    return this.panierStore.sousTotal();
  }

  get nombreArticles(): number {
    return this.panierStore.nombreArticles();
  }

  incrementer(item: any) {
    this.panierStore.incrementer(item.id);
  }

  decrementer(item: any) {
    this.panierStore.decrementer(item.id);
  }

  supprimerItem(item: any) {
    this.panierStore.retirer(item.id);
  }

  viderPanier() {
    if (!confirm('Vider tout le panier ?')) return;
    this.panierStore.vider();
    this.promoAppliquee = false;
    this.promoReduction = 0;
    this.codePromo = '';
    this.promoMessage = '';
  }

  // ══ ZONES ══
  chargerZones() {
    this.loadingZones = true;

    this.api.get<any>('zones/actives').subscribe({
      next: (data) => {
        if (data.success) {
          this.zones = data.data || [];
          if (this.adresseLivraison) this.detecterZone();
        }
        this.loadingZones = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.zones = [];
        this.loadingZones = false;
        this.cdr.detectChanges();
      }
    });
  }

  detecterZone() {
    if (!this.adresseLivraison || this.zones.length === 0) return;
    if (this.zoneChoisie) return;

    const adr = this.adresseLivraison.toLowerCase();
    for (const z of this.zones) {
      if (!z.quartiers) continue;
      const quartiers = z.quartiers.split(',').map((q: string) => q.trim().toLowerCase());
      for (const q of quartiers) {
        if (q && adr.includes(q)) {
          this.zoneChoisie = z.id;
          this.onZoneChange();
          return;
        }
      }
    }
  }

  onAdresseChange() {
    this.detecterZone();
    this.cdr.detectChanges();
  }

  onZoneChange() {
    if (this.zoneChoisie === 'autre') {
      this.zoneNonListee = true;
      this.zoneActive = null;
    } else if (this.zoneChoisie) {
      this.zoneNonListee = false;
      this.zoneActive = this.zones.find(z => z.id == this.zoneChoisie) || null;
    } else {
      this.zoneNonListee = false;
      this.zoneActive = null;
    }
    this.erreur = '';
    this.cdr.detectChanges();
  }

  // ══ TOTAUX ══
  get montantReduction(): number {
    return Math.round(this.sousTotal * this.promoReduction / 100);
  }

  get montantApresPromo(): number {
    return this.sousTotal - this.montantReduction;
  }

  get fraisLivraison(): number {
    if (this.modeLivraison === 'emporter') return 0;
    if (this.zoneNonListee) return 0;
    if (!this.zoneActive) return 0;

    const seuil = parseFloat(this.zoneActive.livraison_gratuite_des) || 0;
    if (seuil > 0 && this.montantApresPromo >= seuil) return 0;

    return parseFloat(this.zoneActive.frais_livraison) || 0;
  }

  get livraisonEstGratuite(): boolean {
    if (this.modeLivraison === 'emporter') return false;
    if (!this.zoneActive) return false;
    const seuil = parseFloat(this.zoneActive.livraison_gratuite_des) || 0;
    return seuil > 0 && this.montantApresPromo >= seuil;
  }

  get libelleLivraison(): string {
    if (this.modeLivraison === 'emporter') return '—';
    if (this.zoneNonListee) return 'À définir';
    if (!this.zoneActive) return 'Choisir une zone';
    if (this.livraisonEstGratuite) return 'Offerte';
    return this.formaterMontant(this.fraisLivraison);
  }

  get total(): number {
    return this.montantApresPromo + this.fraisLivraison;
  }

  // ══ MINIMUM ══
  get minimumZone(): number {
    if (!this.zoneActive) return 0;
    return parseFloat(this.zoneActive.min_commande) || 0;
  }

  get minimumAtteint(): boolean {
    if (this.modeLivraison === 'emporter') return true;
    if (!this.zoneActive) return true;
    return this.montantApresPromo >= this.minimumZone;
  }

  get manqueMinimum(): number {
    return Math.max(0, this.minimumZone - this.montantApresPromo);
  }

  get seuilGratuite(): number {
    if (!this.zoneActive) return 0;
    return parseFloat(this.zoneActive.livraison_gratuite_des) || 0;
  }

  get manqueGratuite(): number {
    if (this.seuilGratuite <= 0) return 0;
    return Math.max(0, this.seuilGratuite - this.montantApresPromo);
  }

  get peutCommander(): boolean {
    if (this.panierStore.estVide()) return false;
    if (this.modeLivraison === 'emporter') return true;
    if (!this.adresseLivraison.trim()) return false;
    if (!this.zoneChoisie) return false;
    if (this.zoneNonListee && !this.quartierSaisi.trim()) return false;
    if (!this.minimumAtteint) return false;
    return true;
  }

  get delaiZone(): string {
    if (this.modeLivraison === 'emporter') return 'Prêt dans 15 min';
    if (!this.zoneActive) return 'Selon la zone';
    return `${this.zoneActive.delai_min}–${this.zoneActive.delai_max} min`;
  }

  // ══ CODE PROMO ══
  appliquerPromo() {
    const codes: any = {
      'BIENVENUE20': 20,
      'QUICKBITE10': 10,
      'DAKAR15': 15,
      'KHALIL25': 25
    };

    const code = this.codePromo.toUpperCase().trim();
    if (codes[code]) {
      this.promoAppliquee = true;
      this.promoReduction = codes[code];
      this.promoMessage = `✅ Code appliqué · −${this.promoReduction}% sur vos articles`;
    } else {
      this.promoAppliquee = false;
      this.promoReduction = 0;
      this.promoMessage = '❌ Code promo invalide ou expiré';
    }
    this.cdr.detectChanges();
  }

  // ══ PASSER LA COMMANDE ══
  passerCommande() {
    if (this.panierStore.estVide()) {
      this.erreur = 'Votre panier est vide'; return;
    }

    if (this.modeLivraison === 'domicile') {
      if (!this.adresseLivraison.trim()) {
        this.erreur = 'Veuillez entrer votre adresse de livraison'; return;
      }
      if (!this.zoneChoisie) {
        this.erreur = 'Veuillez choisir votre zone de livraison'; return;
      }
      if (this.zoneNonListee && !this.quartierSaisi.trim()) {
        this.erreur = 'Indiquez le nom de votre quartier'; return;
      }
      if (!this.minimumAtteint) {
        this.erreur =
          `Commande minimum de ${this.formaterMontant(this.minimumZone)} pour cette zone. ` +
          `Il manque ${this.formaterMontant(this.manqueMinimum)}.`;
        return;
      }
    }

    if (!this.authStore.estConnecte()) {
      this.router.navigate(['/login'], { queryParams: { retour: '/panier' } });
      return;
    }

    this.loadingCommande = true;
    this.erreur = '';
    this.cdr.detectChanges();

    const articles = this.items;
    const restaurant_id = articles[0]?.restaurant_id;

    let notes = '';
    if (this.modeLivraison === 'emporter') {
      notes = 'Commande à emporter';
    } else if (this.zoneNonListee) {
      notes = `⚠️ ZONE À DÉFINIR · Quartier indiqué : ${this.quartierSaisi} · ` +
              `Contacter le client pour fixer le prix de livraison`;
    } else if (this.zoneActive) {
      notes = `Zone : ${this.zoneActive.nom}`;
    }

    const commandeData: any = {
      restaurant_id,
      adresse_livraison: this.modeLivraison === 'emporter'
        ? 'À emporter'
        : this.adresseLivraison,
      mode_paiement: this.modePaiement,
      items: articles.map(i => ({
        plat_id: i.id,
        quantite: i.quantite,
        prix_unitaire: i.prix
      })),
      montant_total: this.total,
      frais_livraison: this.fraisLivraison,
      reduction: this.montantReduction,
      code_promo: this.promoAppliquee ? this.codePromo : '',
      notes,
      zone_id: (this.zoneNonListee || this.modeLivraison === 'emporter')
        ? null
        : this.zoneChoisie
    };

    this.api.post<any>('commandes', commandeData).subscribe({
      next: (data) => {
        this.loadingCommande = false;

        if (data.success || data.commande) {
          const commande = data.commande || data;

          this.envoyerWhatsApp(commande, articles);
          this.panierStore.vider();

          this.succes = this.zoneNonListee
            ? `✅ Commande #${commande.numero || ''} envoyée ! Nous vous appellerons pour confirmer le prix de livraison.`
            : `✅ Commande #${commande.numero || ''} passée avec succès !`;

          this.cdr.detectChanges();

          setTimeout(() => {
            this.router.navigate(['/suivi-commande'], {
              queryParams: { commande_id: commande.id }
            });
          }, 2500);
        } else {
          this.erreur = data.message || 'Erreur lors de la commande';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.loadingCommande = false;
        this.erreur = err?.message || 'Erreur de connexion. Réessayez.';
        this.cdr.detectChanges();
      }
    });
  }

  // ══ WHATSAPP ══
  envoyerWhatsApp(commande: any, articlesSnapshot?: any[]) {
    const liste = articlesSnapshot || this.items;
    const u = this.utilisateur;

    const articles = liste.map(i =>
      `• ${i.nom} x${i.quantite} — ${this.formaterMontant(i.prix * i.quantite)}`
    ).join('\n');

    const ligneLivraison = this.modeLivraison === 'emporter'
      ? '🏃 À emporter'
      : this.zoneNonListee
        ? `⚠️ Zone à définir · Quartier : ${this.quartierSaisi}`
        : `🛵 ${this.zoneActive?.nom} · ${this.formaterMontant(this.fraisLivraison)}`;

    const sousTotalSnapshot = liste.reduce((s, i) => s + (i.prix * i.quantite), 0);

    const message = encodeURIComponent(
      `🍔 *Nouvelle commande QuickBite SN*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📋 Commande #${commande.numero || 'N/A'}\n` +
      `👤 Client : ${u?.prenom} ${u?.nom}\n` +
      `📞 Tél : ${u?.telephone || 'Non renseigné'}\n` +
      `📍 Adresse : ${commande.adresse_livraison}\n` +
      `${ligneLivraison}\n` +
      `💳 Paiement : ${this.getPaiementLabel(this.modePaiement)}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🛒 *Articles :*\n${articles}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 Sous-total : ${this.formaterMontant(sousTotalSnapshot)}\n` +
      (this.promoAppliquee ? `🎁 Réduction : −${this.formaterMontant(this.montantReduction)}\n` : '') +
      `🛵 Livraison : ${this.libelleLivraison}\n` +
      `✅ *TOTAL : ${this.formaterMontant(this.total)}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⏰ ${new Date().toLocaleString('fr-FR')}`
    );

    window.open(`https://wa.me/${this.whatsappNumero.replace('+', '')}?text=${message}`, '_blank');
  }

  commanderViaWhatsApp() {
    if (this.panierStore.estVide()) {
      this.erreur = 'Votre panier est vide'; return;
    }
    if (this.modeLivraison === 'domicile' && !this.adresseLivraison.trim()) {
      this.erreur = 'Veuillez entrer votre adresse de livraison'; return;
    }

    const liste = this.items;
    const u = this.utilisateur;

    const articles = liste.map(i =>
      `• ${i.emoji || '🍽️'} ${i.nom} x${i.quantite} = ${this.formaterMontant(i.prix * i.quantite)}`
    ).join('\n');

    const ligneLivraison = this.modeLivraison === 'emporter'
      ? '🏃 À emporter'
      : this.zoneNonListee
        ? `⚠️ Zone à définir · Quartier : ${this.quartierSaisi}`
        : this.zoneActive
          ? `🛵 ${this.zoneActive.nom} · ${this.libelleLivraison}`
          : '🛵 Zone non précisée';

    const message = encodeURIComponent(
      `🍔 *Commande QuickBite SN*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 ${u?.prenom || 'Client'} ${u?.nom || ''}\n` +
      `📞 ${u?.telephone || 'Non renseigné'}\n` +
      `📍 ${this.modeLivraison === 'emporter' ? 'À emporter' : this.adresseLivraison}\n` +
      `${ligneLivraison}\n` +
      `💳 ${this.getPaiementLabel(this.modePaiement)}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${articles}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 *TOTAL : ${this.formaterMontant(this.total)}*`
    );

    window.open(`https://wa.me/${this.whatsappNumero.replace('+', '')}?text=${message}`, '_blank');

    this.panierStore.vider();
    this.succes = '✅ Commande envoyée sur WhatsApp !';
    this.cdr.detectChanges();
  }

  getPaiementLabel(mode: string): string {
    const map: any = {
      'wave': '📱 Wave',
      'orange_money': '🟠 Orange Money',
      'carte': '💳 Carte bancaire',
      'especes': '💵 Espèces à la livraison'
    };
    return map[mode] || mode;
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  getPlatPhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `${environment.serverUrl}/uploads/plats/${photo}`;
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
}