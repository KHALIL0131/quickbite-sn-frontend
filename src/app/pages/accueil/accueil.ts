import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-accueil',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './accueil.html',
  styleUrl: './accueil.scss'
})
export class Accueil implements OnInit {
  utilisateur: any = null;


  searchQuery = '';
  categorieActive = 'Tout';
  cartCount = 0;
  menuOpen = false;
  logoClickCount = 0;
  logoClickTimer: any;

  categories: any[] = [];
  restaurants: any[] = [];
  plats: any[] = [];

  steps = [
    { num: '1', icon: '📍', titre: 'Choisissez votre adresse', desc: 'Entrez votre adresse à Dakar pour voir les restaurants disponibles près de vous' },
    { num: '2', icon: '🍽️', titre: 'Sélectionnez vos plats', desc: 'Parcourez 120+ restaurants, ajoutez vos plats préférés au panier' },
    { num: '3', icon: '💳', titre: 'Payez en toute sécurité', desc: 'Wave, Orange Money, carte bancaire ou espèces. 100% sécurisé' },
    { num: '4', icon: '🛵', titre: 'Recevez chez vous', desc: 'Suivez votre livreur en temps réel sur la carte. Livraison en 30 min' },
  ];

  chargementRestaurants = true;
  chargementPlats = true;
  chargementCategories = true;
  erreur = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    const u = localStorage.getItem("utilisateur"); if (u) this.utilisateur = JSON.parse(u);
    this.chargerCategories();
    this.chargerRestaurants();
    this.chargerPlatsPopulaires();
    this.chargerPanier();
  }

  chargerCategories() {
    this.chargementCategories = true;

    // Vérifier cache localStorage
    const cache = localStorage.getItem('cache_categories');
    const cacheTime = localStorage.getItem('cache_categories_time');
    if (cache && cacheTime) {
      const duree = Date.now() - parseInt(cacheTime);
      if (duree < 5 * 60 * 1000) {
        this.categories = [{ id: 0, nom: 'Tout', emoji: '🍽️' }, ...JSON.parse(cache)];
        this.chargementCategories = false;
        this.cdr.detectChanges();
        return;
      }
    }

    fetch(`${this.apiUrl}/categories`)
      .then(res => res.json())
      .then(data => {
        this.categories = [{ id: 0, nom: 'Tout', emoji: '🍽️' }, ...data.data];
        localStorage.setItem('cache_categories', JSON.stringify(data.data));
        localStorage.setItem('cache_categories_time', Date.now().toString());
        this.chargementCategories = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.chargementCategories = false;
        this.cdr.detectChanges();
      });
  }

  chargerRestaurants() {
    this.chargementRestaurants = true;

    // Vérifier cache localStorage
    const cache = localStorage.getItem('cache_restaurants');
    const cacheTime = localStorage.getItem('cache_restaurants_time');
    if (cache && cacheTime) {
      const duree = Date.now() - parseInt(cacheTime);
      if (duree < 2 * 60 * 1000) {
        this.restaurants = JSON.parse(cache);
        this.chargementRestaurants = false;
        this.cdr.detectChanges();
        return;
      }
    }

    fetch(`${this.apiUrl}/restaurants`)
      .then(res => res.json())
      .then(data => {
        this.restaurants = data.data || [];
        localStorage.setItem('cache_restaurants', JSON.stringify(this.restaurants));
        localStorage.setItem('cache_restaurants_time', Date.now().toString());
        this.chargementRestaurants = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.chargementRestaurants = false;
        this.erreur = 'Impossible de charger les restaurants';
        this.cdr.detectChanges();
      });
  }

  chargerPlatsPopulaires() {
    this.chargementPlats = true;

    // Vérifier cache localStorage
    const cache = localStorage.getItem('cache_plats');
    const cacheTime = localStorage.getItem('cache_plats_time');
    if (cache && cacheTime) {
      const duree = Date.now() - parseInt(cacheTime);
      if (duree < 2 * 60 * 1000) {
        this.plats = JSON.parse(cache).map((p: any) => ({ ...p, quantite: 0 }));
        this.chargementPlats = false;
        this.cdr.detectChanges();
        return;
      }
    }

    fetch(`${this.apiUrl}/plats/populaires`)
      .then(res => res.json())
      .then(data => {
        this.plats = (data.data || []).map((p: any) => ({ ...p, quantite: 0 }));
        localStorage.setItem('cache_plats', JSON.stringify(data.data || []));
        localStorage.setItem('cache_plats_time', Date.now().toString());
        this.chargementPlats = false;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.chargementPlats = false;
        this.cdr.detectChanges();
      });
  }

  filtrerCategorie(nomCategorie: string) {
    this.categorieActive = nomCategorie;

    if (nomCategorie === 'Tout') {
      this.chargerRestaurants();
      this.chargerPlatsPopulaires();
      return;
    }

    // Filtrer plats par catégorie
    const cat = this.categories.find(c => c.nom === nomCategorie);
    if (cat && cat.id) {
      fetch(`${this.apiUrl}/plats?categorie_id=${cat.id}`)
        .then(res => res.json())
        .then(data => {
          this.plats = (data.data || []).map((p: any) => ({ ...p, quantite: 0 }));
          this.cdr.detectChanges();
        });
    }
  }

  ajouterAuPanier(plat: any) {
    plat.quantite++;
    this.cartCount++;
    this.cdr.detectChanges();

    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    const existant = panier.find((p: any) => p.id === plat.id);
    if (existant) {
      existant.quantite++;
    } else {
      panier.push({
        id: plat.id,
        nom: plat.nom,
        prix: plat.prix,
        emoji: plat.emoji,
        photo: plat.photo,
        restaurant_nom: plat.restaurant_nom,
        restaurant_id: plat.restaurant_id,
        quantite: 1
      });
    }
    localStorage.setItem('panier', JSON.stringify(panier));
  }

  chargerPanier() {
    const panier = JSON.parse(localStorage.getItem('panier') || '[]');
    this.cartCount = panier.reduce((total: number, p: any) => total + p.quantite, 0);
    this.cdr.detectChanges();
  }

  toggleFav(resto: any) {
    resto.fav = !resto.fav;
    this.cdr.detectChanges();
  }

  getPhotoUrl(photo: string): string {
    if (!photo) return '';
    return `http://localhost:3000/uploads/restaurants/${photo}`;
  }

  getPlatPhotoUrl(photo: string): string {
    if (!photo) return '';
    return `http://localhost:3000/uploads/plats/${photo}`;
  }

  onLogoClick() {
    this.logoClickCount++;
    clearTimeout(this.logoClickTimer);
    this.logoClickTimer = setTimeout(() => {
      this.logoClickCount = 0;
    }, 1000);
    if (this.logoClickCount >= 3) {
      this.logoClickCount = 0;
      this.router.navigate(['/admin-login']);
    }
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToLogin() { this.router.navigate(['/login']); }
  goToRegister() { this.router.navigate(['/register']); }
  goToPanier() { this.router.navigate(['/panier']); }

  goToRestaurants() { this.router.navigate(['/menu']); }
  goToOffres() { this.router.navigate(['/menu']); }
  goToAPropos() { this.router.navigate(['/a-propos']); }

  goToMessagerie() { this.router.navigate(['/messagerie']); }
}