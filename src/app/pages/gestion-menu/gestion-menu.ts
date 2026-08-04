import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gestion-menu',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-menu.html',
  styleUrl: './gestion-menu.scss'
})
export class GestionMenu implements OnInit {

  admin: any = null;
  sidebarOpen = false;

  plats: any[] = [];
  platsFiltres: any[] = [];
  categories: any[] = [];
  restaurants: any[] = [];
  loading = true;
  loadingRestos = true;

  ongletActif = 'plats';

  searchQuery = '';
  categorieActive = 'Tout';
  searchResto = '';

  stats = { total: 0, disponibles: 0, indisponibles: 0, categories: 0 };

  showModal = false;
  showModalRestaurant = false;
  showModalModifierPlat = false;
  showModalModifierResto = false;
  loadingSave = false;
  erreurModal = '';

  nouveauPlat = {
    nom: '', description: '', prix: '',
    emoji: '🍽️', categorie_id: '', restaurant_id: '',
    est_disponible: true, est_populaire: false,
    note_moyenne: 0, nombre_commandes: 0
  };

  platEnEdition: any = null;
  platEdit = {
    nom: '', description: '', prix: '',
    emoji: '🍽️', categorie_id: '', restaurant_id: '',
    est_disponible: true, est_populaire: false,
    note_moyenne: 0, nombre_commandes: 0
  };

  nouveauRestaurant = {
    nom: '', description: '', adresse: '', ville: 'Dakar',
    telephone: '', email: '', note_moyenne: 0, nombre_avis: 0,
    temps_livraison: '30 min', frais_livraison: 0,
    livraison_gratuite: true, est_ouvert: true, est_actif: true,
    proprietaire_id: ''
  };

  restoEnEdition: any = null;
  restoEdit = {
    nom: '', description: '', adresse: '', ville: 'Dakar',
    telephone: '', email: '', temps_livraison: '30 min',
    frais_livraison: 0, livraison_gratuite: true,
    est_ouvert: true, est_actif: true
  };

  photoFilePlat: File | null = null;
  photoPreviewPlat = '';
  photoFileResto: File | null = null;
  photoPreviewResto = '';

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerCategories();
    this.chargerPlats();
    this.chargerRestaurants();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
    this.nouveauRestaurant.proprietaire_id = this.admin.id?.toString() || '';
  }

  // ══ PHOTOS ══
  cliquerPhotoPLat() {
    const input = document.getElementById('photoPlatInput') as HTMLInputElement;
    if (input) { input.value = ''; input.click(); }
  }

  cliquerPhotoResto() {
    const input = document.getElementById('photoRestoInput') as HTMLInputElement;
    if (input) { input.value = ''; input.click(); }
  }

  onPhotoChangePlat(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    this.photoFilePlat = input.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => { this.photoPreviewPlat = e.target.result; this.cdr.detectChanges(); };
    reader.readAsDataURL(this.photoFilePlat);
  }

  onPhotoChangeResto(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    this.photoFileResto = input.files[0];
    const reader = new FileReader();
    reader.onload = (e: any) => { this.photoPreviewResto = e.target.result; this.cdr.detectChanges(); };
    reader.readAsDataURL(this.photoFileResto);
  }

  supprimerPhotoPLat() {
    this.photoFilePlat = null;
    this.photoPreviewPlat = '';
    const i = document.getElementById('photoPlatInput') as HTMLInputElement;
    if (i) i.value = '';
    this.cdr.detectChanges();
  }

  supprimerPhotoResto() {
    this.photoFileResto = null;
    this.photoPreviewResto = '';
    const i = document.getElementById('photoRestoInput') as HTMLInputElement;
    if (i) i.value = '';
    this.cdr.detectChanges();
  }

  // ══ CHARGEMENT ══
  chargerCategories() {
    fetch(`${this.apiUrl}/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.categories = data.data;
          this.stats.categories = data.data.length;
        }
        this.cdr.detectChanges();
      }).catch(() => {});
  }

  chargerPlats() {
    this.loading = true;
    fetch(`${this.apiUrl}/plats`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.plats = data.data;
          this.calculerStats();
          this.filtrer();
        }
        this.loading = false;
        this.cdr.detectChanges();
      }).catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  chargerRestaurants() {
    this.loadingRestos = true;
    fetch(`${this.apiUrl}/restaurants`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.restaurants = data.data;
          if (this.restaurants.length > 0 && !this.nouveauPlat.restaurant_id) {
            this.nouveauPlat.restaurant_id = this.restaurants[0].id;
          }
        }
        this.loadingRestos = false;
        this.cdr.detectChanges();
      }).catch(() => { this.loadingRestos = false; this.cdr.detectChanges(); });
  }

  calculerStats() {
    this.stats.total = this.plats.length;
    this.stats.disponibles = this.plats.filter(p => p.est_disponible).length;
    this.stats.indisponibles = this.plats.filter(p => !p.est_disponible).length;
  }

  filtrer() {
    let result = [...this.plats];
    if (this.categorieActive !== 'Tout') {
      result = result.filter(p => p.categorie_nom === this.categorieActive);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.nom?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    this.platsFiltres = result;
    this.cdr.detectChanges();
  }

  filtrerCategorie(cat: string) {
    this.categorieActive = cat;
    this.filtrer();
  }

  get restaurantsFiltres() {
    if (!this.searchResto) return this.restaurants;
    const q = this.searchResto.toLowerCase();
    return this.restaurants.filter(r =>
      r.nom?.toLowerCase().includes(q) ||
      r.adresse?.toLowerCase().includes(q)
    );
  }

  // ══ MODIFIER PLAT ══
  ouvrirModifierPlat(plat: any) {
    this.platEnEdition = plat;
    this.platEdit = {
      nom: plat.nom,
      description: plat.description || '',
      prix: plat.prix,
      emoji: plat.emoji || '🍽️',
      categorie_id: plat.categorie_id || '',
      restaurant_id: plat.restaurant_id || '',
      est_disponible: plat.est_disponible,
      est_populaire: plat.est_populaire,
      note_moyenne: plat.note_moyenne || 0,
      nombre_commandes: plat.nombre_commandes || 0
    };
    this.photoPreviewPlat = plat.photo ? this.getPlatPhotoUrl(plat.photo) : '';
    this.photoFilePlat = null;
    this.showModalModifierPlat = true;
    this.erreurModal = '';
    this.cdr.detectChanges();
  }

  sauvegarderModificationPlat() {
    if (!this.platEdit.nom || !this.platEdit.prix) {
      this.erreurModal = 'Nom et prix obligatoires';
      return;
    }
    this.loadingSave = true;
    this.erreurModal = '';
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('nom', this.platEdit.nom);
    formData.append('description', this.platEdit.description || '');
    formData.append('prix', this.platEdit.prix.toString());
    formData.append('emoji', this.platEdit.emoji || '🍽️');
    formData.append('categorie_id', this.platEdit.categorie_id?.toString() || '');
    formData.append('restaurant_id', this.platEdit.restaurant_id?.toString() || '');
    formData.append('est_disponible', this.platEdit.est_disponible ? '1' : '0');
    formData.append('est_populaire', this.platEdit.est_populaire ? '1' : '0');
    formData.append('note_moyenne', this.platEdit.note_moyenne?.toString() || '0');
    formData.append('nombre_commandes', this.platEdit.nombre_commandes?.toString() || '0');
    if (this.photoFilePlat) formData.append('photo', this.photoFilePlat);

    fetch(`${this.apiUrl}/plats/${this.platEnEdition.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.showModalModifierPlat = false;
        this.supprimerPhotoPLat();
        // Mise à jour locale SANS recharger
        const index = this.plats.findIndex(p => p.id === this.platEnEdition.id);
        if (index !== -1) {
          this.plats[index] = {
            ...this.plats[index],
            nom: this.platEdit.nom,
            description: this.platEdit.description,
            prix: this.platEdit.prix,
            emoji: this.platEdit.emoji,
            categorie_id: this.platEdit.categorie_id,
            restaurant_id: this.platEdit.restaurant_id,
            est_disponible: this.platEdit.est_disponible,
            est_populaire: this.platEdit.est_populaire,
            note_moyenne: this.platEdit.note_moyenne,
            nombre_commandes: this.platEdit.nombre_commandes
          };
        }
        this.calculerStats();
        this.filtrer();
        this.erreurModal = '';
      } else {
        this.erreurModal = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingSave = false;
      this.erreurModal = 'Erreur connexion';
      this.cdr.detectChanges();
    });
  }

  // ══ MODIFIER RESTAURANT ══
  ouvrirModifierResto(resto: any) {
    this.restoEnEdition = resto;
    this.restoEdit = {
      nom: resto.nom,
      description: resto.description || '',
      adresse: resto.adresse || '',
      ville: resto.ville || 'Dakar',
      telephone: resto.telephone || '',
      email: resto.email || '',
      temps_livraison: resto.temps_livraison || '30 min',
      frais_livraison: resto.frais_livraison || 0,
      livraison_gratuite: !!resto.livraison_gratuite,
      est_ouvert: !!resto.est_ouvert,
      est_actif: !!resto.est_actif
    };
    this.photoPreviewResto = resto.photo ? this.getRestoPhotoUrl(resto.photo) : '';
    this.photoFileResto = null;
    this.showModalModifierResto = true;
    this.erreurModal = '';
    this.cdr.detectChanges();
  }

  sauvegarderModificationResto() {
    if (!this.restoEdit.nom || !this.restoEdit.adresse) {
      this.erreurModal = 'Nom et adresse obligatoires';
      return;
    }
    this.loadingSave = true;
    this.erreurModal = '';
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('nom', this.restoEdit.nom);
    formData.append('description', this.restoEdit.description || '');
    formData.append('adresse', this.restoEdit.adresse);
    formData.append('ville', this.restoEdit.ville || 'Dakar');
    formData.append('telephone', this.restoEdit.telephone || '');
    formData.append('email', this.restoEdit.email || '');
    formData.append('temps_livraison', this.restoEdit.temps_livraison || '30 min');
    formData.append('frais_livraison', this.restoEdit.frais_livraison?.toString() || '0');
    formData.append('livraison_gratuite', this.restoEdit.livraison_gratuite ? '1' : '0');
    formData.append('est_ouvert', this.restoEdit.est_ouvert ? '1' : '0');
    formData.append('est_actif', this.restoEdit.est_actif ? '1' : '0');
    if (this.photoFileResto) formData.append('photo', this.photoFileResto);

    fetch(`${this.apiUrl}/restaurants/${this.restoEnEdition.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.showModalModifierResto = false;
        this.supprimerPhotoResto();
        // Mise à jour locale SANS recharger
        const index = this.restaurants.findIndex(r => r.id === this.restoEnEdition.id);
        if (index !== -1) {
          this.restaurants[index] = {
            ...this.restaurants[index],
            nom: this.restoEdit.nom,
            description: this.restoEdit.description,
            adresse: this.restoEdit.adresse,
            ville: this.restoEdit.ville,
            telephone: this.restoEdit.telephone,
            email: this.restoEdit.email,
            temps_livraison: this.restoEdit.temps_livraison,
            frais_livraison: this.restoEdit.frais_livraison,
            livraison_gratuite: this.restoEdit.livraison_gratuite,
            est_ouvert: this.restoEdit.est_ouvert,
            est_actif: this.restoEdit.est_actif
          };
        }
        this.erreurModal = '';
      } else {
        this.erreurModal = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingSave = false;
      this.erreurModal = 'Erreur connexion';
      this.cdr.detectChanges();
    });
  }

  // ══ TOGGLE RESTAURANT ══
  toggleRestoActif(resto: any) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('nom', resto.nom);
    formData.append('adresse', resto.adresse || '');
    formData.append('est_actif', (!resto.est_actif) ? '1' : '0');
    formData.append('est_ouvert', resto.est_ouvert ? '1' : '0');

    fetch(`${this.apiUrl}/restaurants/${resto.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        resto.est_actif = !resto.est_actif;
        this.cdr.detectChanges();
      }
    }).catch(() => {});
  }

  supprimerResto(resto: any) {
    if (!confirm(`Supprimer "${resto.nom}" ?`)) return;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/restaurants/${resto.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.restaurants = this.restaurants.filter(r => r.id !== resto.id);
        this.cdr.detectChanges();
      }
    }).catch(() => {});
  }

  // ══ SAUVEGARDER PLAT ══
  sauvegarderPlat() {
    if (!this.nouveauPlat.nom || !this.nouveauPlat.prix) {
      this.erreurModal = 'Veuillez remplir le nom et le prix';
      return;
    }
    if (!this.nouveauPlat.restaurant_id) {
      this.erreurModal = 'Veuillez sélectionner un restaurant';
      return;
    }
    this.loadingSave = true;
    this.erreurModal = '';
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('nom', this.nouveauPlat.nom);
    formData.append('description', this.nouveauPlat.description || '');
    formData.append('prix', this.nouveauPlat.prix.toString());
    formData.append('emoji', this.nouveauPlat.emoji || '🍽️');
    formData.append('categorie_id', this.nouveauPlat.categorie_id?.toString() || '');
    formData.append('restaurant_id', this.nouveauPlat.restaurant_id.toString());
    formData.append('est_disponible', this.nouveauPlat.est_disponible ? '1' : '0');
    formData.append('est_populaire', this.nouveauPlat.est_populaire ? '1' : '0');
    formData.append('note_moyenne', '0.00');
    formData.append('nombre_commandes', '0');
    if (this.photoFilePlat) formData.append('photo', this.photoFilePlat);

    fetch(`${this.apiUrl}/plats`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.showModal = false;
        this.resetFormPlat();
        // Ajouter localement SANS recharger
        const nouveauPlatAjoute = {
          id: data.id,
          nom: this.nouveauPlat.nom,
          description: this.nouveauPlat.description,
          prix: this.nouveauPlat.prix,
          emoji: this.nouveauPlat.emoji,
          categorie_id: this.nouveauPlat.categorie_id,
          restaurant_id: this.nouveauPlat.restaurant_id,
          est_disponible: true,
          est_populaire: this.nouveauPlat.est_populaire,
          note_moyenne: 0,
          nombre_commandes: 0,
          restaurant_nom: this.restaurants.find(r => r.id == this.nouveauPlat.restaurant_id)?.nom || ''
        };
        this.plats.unshift(nouveauPlatAjoute);
        this.calculerStats();
        this.filtrer();
      } else {
        this.erreurModal = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingSave = false;
      this.erreurModal = 'Erreur connexion';
      this.cdr.detectChanges();
    });
  }

  // ══ SAUVEGARDER RESTAURANT ══
  sauvegarderRestaurant() {
    if (!this.nouveauRestaurant.nom || !this.nouveauRestaurant.adresse) {
      this.erreurModal = 'Veuillez remplir le nom et l\'adresse';
      return;
    }
    this.loadingSave = true;
    this.erreurModal = '';
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('nom', this.nouveauRestaurant.nom);
    formData.append('description', this.nouveauRestaurant.description || '');
    formData.append('adresse', this.nouveauRestaurant.adresse);
    formData.append('ville', this.nouveauRestaurant.ville || 'Dakar');
    formData.append('telephone', this.nouveauRestaurant.telephone || '');
    formData.append('email', this.nouveauRestaurant.email || '');
    formData.append('note_moyenne', '0.00');
    formData.append('nombre_avis', '0');
    formData.append('temps_livraison', this.nouveauRestaurant.temps_livraison || '30 min');
    formData.append('frais_livraison', this.nouveauRestaurant.frais_livraison.toString());
    formData.append('livraison_gratuite', this.nouveauRestaurant.livraison_gratuite ? '1' : '0');
    formData.append('est_ouvert', this.nouveauRestaurant.est_ouvert ? '1' : '0');
    formData.append('est_actif', '1');
    formData.append('proprietaire_id', this.admin?.id?.toString() || '');
    if (this.photoFileResto) formData.append('photo', this.photoFileResto);

    fetch(`${this.apiUrl}/restaurants`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.showModalRestaurant = false;
        // Ajouter localement SANS recharger
        const nouveauResto = {
          id: data.id,
          nom: this.nouveauRestaurant.nom,
          description: this.nouveauRestaurant.description,
          adresse: this.nouveauRestaurant.adresse,
          ville: this.nouveauRestaurant.ville,
          telephone: this.nouveauRestaurant.telephone,
          email: this.nouveauRestaurant.email,
          temps_livraison: this.nouveauRestaurant.temps_livraison,
          frais_livraison: this.nouveauRestaurant.frais_livraison,
          livraison_gratuite: this.nouveauRestaurant.livraison_gratuite,
          est_ouvert: this.nouveauRestaurant.est_ouvert,
          est_actif: true,
          note_moyenne: 0,
          nombre_avis: 0,
          nombre_plats: 0
        };
        this.restaurants.unshift(nouveauResto);
        this.resetFormResto();
      } else {
        this.erreurModal = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingSave = false;
      this.erreurModal = 'Erreur connexion';
      this.cdr.detectChanges();
    });
  }

  toggleDisponibilite(plat: any) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('nom', plat.nom);
    formData.append('description', plat.description || '');
    formData.append('prix', plat.prix.toString());
    formData.append('emoji', plat.emoji || '🍽️');
    formData.append('categorie_id', plat.categorie_id?.toString() || '');
    formData.append('restaurant_id', plat.restaurant_id?.toString() || '');
    formData.append('est_disponible', (!plat.est_disponible) ? '1' : '0');
    formData.append('est_populaire', plat.est_populaire ? '1' : '0');
    formData.append('note_moyenne', plat.note_moyenne?.toString() || '0');
    formData.append('nombre_commandes', plat.nombre_commandes?.toString() || '0');

    fetch(`${this.apiUrl}/plats/${plat.id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        plat.est_disponible = !plat.est_disponible;
        this.calculerStats();
        this.cdr.detectChanges();
      }
    }).catch(() => {});
  }

  supprimerPlat(plat: any) {
    if (!confirm(`Supprimer "${plat.nom}" ?`)) return;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/plats/${plat.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.plats = this.plats.filter(p => p.id !== plat.id);
        this.calculerStats();
        this.filtrer();
      }
    }).catch(() => {});
  }

  resetFormPlat() {
    this.nouveauPlat = {
      nom: '', description: '', prix: '', emoji: '🍽️',
      categorie_id: '', restaurant_id: this.restaurants[0]?.id || '',
      est_disponible: true, est_populaire: false,
      note_moyenne: 0, nombre_commandes: 0
    };
    this.supprimerPhotoPLat();
    this.erreurModal = '';
  }

  resetFormResto() {
    this.nouveauRestaurant = {
      nom: '', description: '', adresse: '', ville: 'Dakar',
      telephone: '', email: '', note_moyenne: 0, nombre_avis: 0,
      temps_livraison: '30 min', frais_livraison: 0,
      livraison_gratuite: true, est_ouvert: true, est_actif: true,
      proprietaire_id: this.admin?.id?.toString() || ''
    };
    this.supprimerPhotoResto();
    this.erreurModal = '';
  }

  getPlatPhotoUrl(photo: string): string {
    return photo ? `http://localhost:3000/uploads/plats/${photo}` : '';
  }

  getRestoPhotoUrl(photo: string): string {
    return photo ? `http://localhost:3000/uploads/restaurants/${photo}` : '';
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