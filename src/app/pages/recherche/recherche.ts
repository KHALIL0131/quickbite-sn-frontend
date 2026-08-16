import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-recherche',
  imports: [CommonModule, FormsModule],
  templateUrl: './recherche.html',
  styleUrl: './recherche.scss'
})
export class Recherche implements OnInit {

  utilisateur: any = null;
  cartCount = 0;

  searchQuery = '';
  chargement = false;
  rechercheEffectuee = false;

  plats: any[] = [];
  restaurants: any[] = [];
  platsFiltres: any[] = [];
  restaurantsFiltres: any[] = [];

  ongletActif = 'restaurants';
  sortActif = 'pertinence';

  // FILTRES
  prixMin = 0;
  prixMax = 20000;
  prixRange = 20000;
  noteMin = 0;
  livraison_gratuite = false;
  delai_max = 0;

  categories: any[] = [];

  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.chargerPanier();
    this.chargerCategories();
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery = params['q'];
        this.rechercher();
      }
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

  chargerCategories() {
    fetch(`${this.apiUrl}/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.success) this.categories = data.data;
        this.cdr.detectChanges();
      }).catch(() => {});
  }

  rechercher() {
    if (!this.searchQuery.trim()) return;
    this.chargement = true;
    this.rechercheEffectuee = false;

    this.router.navigate([], {
      queryParams: { q: this.searchQuery },
      queryParamsHandling: 'merge'
    });

    const q = encodeURIComponent(this.searchQuery.trim());

    Promise.all([
      fetch(`${this.apiUrl}/plats?search=${q}`).then(r => r.json()),
      fetch(`${this.apiUrl}/restaurants?search=${q}`).then(r => r.json())
    ]).then(([platsData, restosData]) => {
      if (platsData.success) {
        this.plats = platsData.data.map((p: any) => ({ ...p, quantite: 0 }));
      }
      if (restosData.success) {
        this.restaurants = restosData.data;
      }
      this.appliquerFiltres();
      this.chargement = false;
      this.rechercheEffectuee = true;
      this.cdr.detectChanges();
    }).catch(() => {
      this.chargement = false;
      this.rechercheEffectuee = true;
      this.cdr.detectChanges();
    });
  }

  appliquerFiltres() {
    // Filtrer plats
    let p = [...this.plats];
    if (this.prixMin > 0) p = p.filter(x => x.prix >= this.prixMin);
    if (this.prixMax < 20000) p = p.filter(x => x.prix <= this.prixMax);
    if (this.noteMin > 0) p = p.filter(x => (x.note_moyenne || 0) >= this.noteMin);

    // Filtrer restaurants
    let r = [...this.restaurants];
    if (this.livraison_gratuite) r = r.filter(x => x.livraison_gratuite);
    if (this.noteMin > 0) r = r.filter(x => (x.note_moyenne || 0) >= this.noteMin);
    if (this.delai_max > 0) r = r.filter(x => parseInt(x.temps_livraison) <= this.delai_max);

    // Trier
    if (this.sortActif === 'note') {
      p.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
      r.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
    } else if (this.sortActif === 'prix') {
      p.sort((a, b) => a.prix - b.prix);
    } else if (this.sortActif === 'delai') {
      r.sort((a, b) => parseInt(a.temps_livraison) - parseInt(b.temps_livraison));
    }

    this.platsFiltres = p;
    this.restaurantsFiltres = r;
    this.cdr.detectChanges();
  }

  onSearchKey(event: KeyboardEvent) {
    if (event.key === 'Enter') this.rechercher();
  }

  onPrixRangeChange() {
    this.prixMax = this.prixRange;
    this.appliquerFiltres();
  }

  ajouterAuPanier(plat: any) {
    plat.quantite++;
    this.cartCount++;
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    const existant = panier.find((p: any) => p.id === plat.id);
    if (existant) existant.quantite++;
    else {
      panier.push({
        id: plat.id, nom: plat.nom, prix: plat.prix,
        emoji: plat.emoji, photo: plat.photo,
        restaurant_nom: plat.restaurant_nom,
        restaurant_id: plat.restaurant_id, quantite: 1
      });
    }
    localStorage.setItem('panier', JSON.stringify(panier));
    this.cdr.detectChanges();
  }

  get totalResultats() {
    return this.platsFiltres.length + this.restaurantsFiltres.length;
  }

  highlightText(text: string): string {
    if (!text || !this.searchQuery) return text;
    const regex = new RegExp(`(${this.searchQuery})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  getPlatPhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `${environment.serverUrl}/uploads/plats/${photo}`;
  }

  getRestoPhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `${environment.serverUrl}/uploads/restaurants/${photo}`;
  }

  getRestoClass(i: number): string {
    return `ri-${(i % 4) + 1}`;
  }

  getInitiales(): string {
    if (!this.utilisateur) return '?';
    return ((this.utilisateur.prenom?.[0] || '') + (this.utilisateur.nom?.[0] || '')).toUpperCase();
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToPanier() { this.router.navigate(['/panier']); }
  goToProfil() { this.router.navigate(['/profil-client']); }
}