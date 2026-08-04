import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class Menu implements OnInit {

  utilisateur: any = null;
  cartCount = 0;
  menuOpen = false;
  searchQuery = '';

  categories: any[] = [];
  restaurants: any[] = [];
  restaurantsFiltres: any[] = [];
  plats: any[] = [];
  platsFiltres: any[] = [];

  categorieActive = 'Tout';
  filtreActif = 'tous';
  sortActif = 'popularite';

  chargementCategories = true;
  chargementRestaurants = true;
  chargementPlats = true;

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.chargerPanier();
    this.chargerCategories();
    this.chargerRestaurants();
    this.chargerPlats();
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (user) this.utilisateur = JSON.parse(user);
  }

  chargerPanier() {
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    this.cartCount = panier.reduce((s: number, p: any) => s + p.quantite, 0);
    this.cdr.detectChanges();
  }

  chargerCategories() {
    fetch(`${this.apiUrl}/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.categories = [{ id: 0, nom: 'Tout', emoji: '🍽️' }, ...data.data];
        }
        this.chargementCategories = false;
        this.cdr.detectChanges();
      }).catch(() => { this.chargementCategories = false; this.cdr.detectChanges(); });
  }

  chargerRestaurants() {
    this.chargementRestaurants = true;
    fetch(`${this.apiUrl}/restaurants`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.restaurants = data.data.map((r: any) => ({ ...r, fav: false }));
          this.filtrerRestaurants();
        }
        this.chargementRestaurants = false;
        this.cdr.detectChanges();
      }).catch(() => { this.chargementRestaurants = false; this.cdr.detectChanges(); });
  }

  chargerPlats() {
    this.chargementPlats = true;
    fetch(`${this.apiUrl}/plats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.plats = data.data.map((p: any) => ({ ...p, quantite: 0 }));
          this.filtrerPlats();
        }
        this.chargementPlats = false;
        this.cdr.detectChanges();
      }).catch(() => { this.chargementPlats = false; this.cdr.detectChanges(); });
  }

  filtrerCategorie(cat: string) {
    this.categorieActive = cat;
    this.filtrerRestaurants();
    this.filtrerPlats();

    if (cat !== 'Tout') {
      const catObj = this.categories.find(c => c.nom === cat);
      if (catObj && catObj.id) {
        fetch(`${this.apiUrl}/plats?categorie_id=${catObj.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              this.platsFiltres = data.data.map((p: any) => ({ ...p, quantite: 0 }));
            }
            this.cdr.detectChanges();
          });
      }
    }
    this.cdr.detectChanges();
  }

  filtrerRestaurants() {
    let result = [...this.restaurants];

    if (this.filtreActif === 'gratuit') {
      result = result.filter(r => r.livraison_gratuite);
    } else if (this.filtreActif === 'rapide') {
      result = result.filter(r => {
        const min = parseInt(r.temps_livraison);
        return !isNaN(min) && min <= 20;
      });
    } else if (this.filtreActif === 'ouvert') {
      result = result.filter(r => r.est_ouvert);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(r =>
        r.nom?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    if (this.sortActif === 'note') {
      result.sort((a, b) => (b.note_moyenne || 0) - (a.note_moyenne || 0));
    } else if (this.sortActif === 'temps') {
      result.sort((a, b) => (parseInt(a.temps_livraison) || 30) - (parseInt(b.temps_livraison) || 30));
    }

    this.restaurantsFiltres = result;
    this.cdr.detectChanges();
  }

  filtrerPlats() {
    let result = [...this.plats];

    if (this.categorieActive !== 'Tout') {
      result = result.filter(p => p.categorie_nom === this.categorieActive);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.nom?.toLowerCase().includes(q) ||
        p.restaurant_nom?.toLowerCase().includes(q)
      );
    }

    this.platsFiltres = result;
    this.cdr.detectChanges();
  }

  onSearch() {
    this.filtrerRestaurants();
    this.filtrerPlats();
  }

  setFiltre(filtre: string) {
    this.filtreActif = filtre;
    this.filtrerRestaurants();
  }

  setSort(sort: string) {
    this.sortActif = sort;
    this.filtrerRestaurants();
  }

  ajouterAuPanier(plat: any) {
    plat.quantite++;
    this.cartCount++;
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    const existant = panier.find((p: any) => p.id === plat.id);
    if (existant) { existant.quantite++; }
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

  toggleFav(resto: any) {
    resto.fav = !resto.fav;
    this.cdr.detectChanges();
  }

  getPhotoUrl(photo: string): string {
    return photo ? `http://localhost:3000/uploads/restaurants/${photo}` : '';
  }

  getPlatPhotoUrl(photo: string): string {
    return photo ? `http://localhost:3000/uploads/plats/${photo}` : '';
  }

  getInitiales(): string {
    if (!this.utilisateur) return '?';
    return ((this.utilisateur.prenom?.[0] || '') + (this.utilisateur.nom?.[0] || '')).toUpperCase();
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToPanier() { this.router.navigate(['/panier']); }
  goToLogin() { this.router.navigate(['/login']); }
  goToRegister() { this.router.navigate(['/register']); }
  goToAPropos() { this.router.navigate(['/a-propos']); }
  goToProfil() { this.router.navigate(['/profil-client']); }

  goToMessagerie() { this.router.navigate(['/messagerie']); }
}