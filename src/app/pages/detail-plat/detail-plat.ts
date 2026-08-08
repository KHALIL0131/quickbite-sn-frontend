import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-detail-plat',
  imports: [CommonModule, FormsModule],
  templateUrl: './detail-plat.html',
  styleUrl: './detail-plat.scss'
})
export class DetailPlat implements OnInit {

  utilisateur: any = null;
  plat: any = null;
  platsSimilaires: any[] = [];
  loading = true;
  cartCount = 0;
  quantite = 1;
  avisListe: any[] = [];
  platId: string | null = null;
  favori = false;
  noteSpeciale = '';

  // OPTIONS ET SUPPLÉMENTS
  optionSelectionnee = '';
  options = [
    { id: 'simple', nom: 'Portion simple', desc: 'Taille standard', supplement: 0 },
    { id: 'double', nom: 'Double portion', desc: 'Pour les gros appétits', supplement: 1000 },
    { id: 'family', nom: 'Formule famille', desc: 'Pour 2-3 personnes', supplement: 2000 },
    { id: 'mini', nom: 'Mini portion', desc: 'Format enfant', supplement: -500 }
  ];

  supplements = [
    { id: 1, emoji: '🧀', nom: 'Fromage supplémentaire', desc: 'Cheddar fondu', prix: 300, checked: false },
    { id: 2, emoji: '🥓', nom: 'Bacon crispy', desc: 'Tranches grillées', prix: 500, checked: false },
    { id: 3, emoji: '🍟', nom: 'Frites maison', desc: 'Portion standard', prix: 800, checked: false },
    { id: 4, emoji: '🥤', nom: 'Boisson au choix', desc: 'Coca, Jus, Eau', prix: 600, checked: false },
    { id: 5, emoji: '🌶️', nom: 'Sauce pimentée', desc: 'Extra épicée', prix: 200, checked: false }
  ];

  private apiUrl = environment.apiUrl;

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.chargerPanier();
    this.route.queryParams.subscribe(params => {
      this.platId = params['id'];
      if (this.platId) this.chargerPlat();
      else { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (user) this.utilisateur = JSON.parse(user);
  }

  chargerPanier() {
    const p = JSON.parse(localStorage.getItem('panier') || '[]');
    this.cartCount = p.reduce((s: number, i: any) => s + i.quantite, 0);
  }

  chargerPlat() {
    this.loading = true;
    const timeout = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 5000);

    fetch(`${this.apiUrl}/plats/${this.platId}`)
      .then(res => res.json())
      .then(data => {
        clearTimeout(timeout);
        if (data.success) {
          this.plat = data.data;
          if (this.plat.categorie_id) this.chargerSimilaires(this.plat.categorie_id);
          this.chargerAvis();
        }
        this.loading = false;
        this.cdr.detectChanges();
      }).catch(() => {
        clearTimeout(timeout);
        this.loading = false;
        this.cdr.detectChanges();
      });
  }

  chargerSimilaires(categorieId: number) {
    fetch(`${this.apiUrl}/plats?categorie_id=${categorieId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.platsSimilaires = data.data
            .filter((p: any) => p.id !== parseInt(this.platId || '0'))
            .slice(0, 4)
            .map((p: any) => ({ ...p, quantite: 0 }));
        }
        this.cdr.detectChanges();
      }).catch(() => {});
  }

  chargerAvis() {
    fetch(`${this.apiUrl}/avis?plat_id=${this.platId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) this.avisListe = data.data || [];
        this.cdr.detectChanges();
      }).catch(() => {});
  }

  selectionnerOption(opt: any) {
    this.optionSelectionnee = opt.id;
    this.cdr.detectChanges();
  }

  toggleSupplement(s: any) {
    s.checked = !s.checked;
    this.cdr.detectChanges();
  }

  toggleFavori() {
    this.favori = !this.favori;
    this.cdr.detectChanges();
  }

  getSupplementsTotal(): number {
    return this.supplements
      .filter(s => s.checked)
      .reduce((sum, s) => sum + s.prix, 0);
  }

  getOptionSupplement(): number {
    if (!this.optionSelectionnee) return 0;
    const opt = this.options.find(o => o.id === this.optionSelectionnee);
    return opt?.supplement || 0;
  }

  getPrixTotal(): number {
    return (this.plat?.prix || 0) + this.getSupplementsTotal() + this.getOptionSupplement();
  }

  ajouterAuPanier(p?: any) {
    const platAAjouter = p || this.plat;
    if (!platAAjouter) return;

    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    const existant = panier.find((item: any) => item.id === platAAjouter.id);
    const qte = p ? 1 : this.quantite;

    if (existant) existant.quantite += qte;
    else {
      panier.push({
        id: platAAjouter.id,
        nom: platAAjouter.nom,
        prix: p ? platAAjouter.prix : this.getPrixTotal(),
        emoji: platAAjouter.emoji,
        photo: platAAjouter.photo,
        restaurant_nom: platAAjouter.restaurant_nom,
        restaurant_id: platAAjouter.restaurant_id,
        quantite: qte,
        note: this.noteSpeciale,
        supplements: this.supplements.filter(s => s.checked).map(s => s.nom)
      });
    }

    localStorage.setItem('panier', JSON.stringify(panier));
    this.cartCount += qte;
    if (p) p.quantite = (p.quantite || 0) + 1;
    this.cdr.detectChanges();
  }

  commanderMaintenant() {
    this.ajouterAuPanier();
    this.router.navigate(['/panier']);
  }

  incrementer() { this.quantite++; this.cdr.detectChanges(); }
  decrementer() { if (this.quantite > 1) { this.quantite--; this.cdr.detectChanges(); } }

  getPlatPhotoUrl(photo: string): string {
    return photo ? `${environment.serverUrl}/uploads/plats/${photo}` : '';
  }

  getInitiales(): string {
    if (!this.utilisateur) return '?';
    return ((this.utilisateur.prenom?.[0] || '') + (this.utilisateur.nom?.[0] || '')).toUpperCase();
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  formaterDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToPanier() { this.router.navigate(['/panier']); }
}