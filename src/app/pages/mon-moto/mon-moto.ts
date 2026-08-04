import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mon-moto',
  imports: [CommonModule, FormsModule],
  templateUrl: './mon-moto.html',
  styleUrl: './mon-moto.scss'
})
export class MonMoto implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;
  loadingSave = false;
  showForm = false;
  succes = '';
  erreur = '';

  vehicule: any = null;

  form = {
    type: 'moto',
    marque: '',
    modele: '',
    immatriculation: '',
    annee: new Date().getFullYear(),
    couleur: '',
    kilometrage: 0
  };

  photoFile: File | null = null;
  photoPreview: string | null = null;

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerVehicule();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

  chargerVehicule() {
    this.loading = true;
    const token = localStorage.getItem('token');

    const timeout = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 5000);

    fetch(`${this.apiUrl}/livreur/vehicule`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeout);
      if (data.success && data.data) {
        this.vehicule = data.data;
        this.form = {
          type: data.data.type || 'moto',
          marque: data.data.marque || '',
          modele: data.data.modele || '',
          immatriculation: data.data.immatriculation || '',
          annee: data.data.annee || new Date().getFullYear(),
          couleur: data.data.couleur || '',
          kilometrage: data.data.kilometrage || 0
        };
      }
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  onPhotoChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  sauvegarder() {
    if (!this.form.marque || !this.form.modele) {
      this.erreur = 'Marque et modèle requis';
      return;
    }

    this.loadingSave = true;
    this.erreur = '';
    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('type', this.form.type);
    formData.append('marque', this.form.marque);
    formData.append('modele', this.form.modele);
    formData.append('immatriculation', this.form.immatriculation);
    formData.append('annee', this.form.annee.toString());
    formData.append('couleur', this.form.couleur);
    formData.append('kilometrage', this.form.kilometrage.toString());
    if (this.photoFile) formData.append('photo', this.photoFile);

    fetch(`${this.apiUrl}/livreur/vehicule`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.succes = '✅ Véhicule sauvegardé avec succès !';
        this.showForm = false;
        this.chargerVehicule();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur lors de la sauvegarde';
      }
      this.cdr.detectChanges();
    }).catch(() => {
      this.loadingSave = false;
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
    });
  }

  getPhotoUrl(photo: string): string {
    return photo ? `http://localhost:3000/uploads/vehicules/${photo}` : '';
  }

  getTypeIcon(type: string): string {
    const map: any = { 'moto': '🏍️', 'voiture': '🚗', 'velo': '🚲', 'autre': '🚐' };
    return map[type] || '🚗';
  }

  getAnneesDisponibles(): number[] {
    const anneeActuelle = new Date().getFullYear();
    return Array.from({ length: 30 }, (_, i) => anneeActuelle - i);
  }

  triggerPhoto() {
  const input = document.getElementById('photoInput') as HTMLInputElement;
  if (input) input.click();
}

  getInitiales(): string {
    if (!this.livreur) return 'L';
    return ((this.livreur.prenom?.[0] || '') + (this.livreur.nom?.[0] || '')).toUpperCase();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-livreur', 'livraisons': '/mes-livraisons',
      'historique': '/historique-livreur', 'gains': '/gains-livreur',
      'carte': '/carte-livreur', 'moto': '/mon-moto',
      'carburant': '/carburant', 'entretien': '/entretien',
      'profil': '/profil-livreur', 'parametres': '/parametres'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}