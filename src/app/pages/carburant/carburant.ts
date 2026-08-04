import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carburant',
  imports: [CommonModule, FormsModule],
  templateUrl: './carburant.html',
  styleUrl: './carburant.scss'
})
export class Carburant implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;
  loadingSave = false;
  showForm = false;
  succes = '';
  erreur = '';

  carburants: any[] = [];
  stats: any = { total_depense: 0, total_litres: 0, nombre_remplissages: 0 };
  vehicule: any = null;

  form = {
    vehicule_id: '',
    litres: '',
    montant: '',
    kilometrage: '',
    date_remplissage: new Date().toISOString().split('T')[0],
    notes: ''
  };

  private apiUrl = 'http://localhost:3000/api';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerDonnees();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

 chargerDonnees() {
  this.loading = true;
  const token = localStorage.getItem('token');

  const timeout = setTimeout(() => {
    this.loading = false;
    this.cdr.detectChanges();
  }, 4000);

  // Charger véhicule
  fetch(`${this.apiUrl}/livreur/vehicule`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.data) {
      this.vehicule = data.data;
      this.form.vehicule_id = data.data.id;
    }
    this.cdr.detectChanges();
  }).catch(() => {});

  // Charger carburants
  fetch(`${this.apiUrl}/livreur/carburant`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    clearTimeout(timeout);
    if (data.success) {
      this.carburants = data.data || [];
      this.stats = data.stats || {
        total_depense: 0, total_litres: 0, nombre_remplissages: 0
      };
    }
    this.loading = false;
    this.cdr.detectChanges();
  }).catch(() => {
    clearTimeout(timeout);
    this.carburants = [];
    this.stats = { total_depense: 0, total_litres: 0, nombre_remplissages: 0 };
    this.loading = false;
    this.cdr.detectChanges();
  });
}

  sauvegarder() {
    if (!this.form.montant || !this.form.date_remplissage) {
      this.erreur = 'Montant et date requis';
      return;
    }

    this.loadingSave = true;
    this.erreur = '';
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/livreur/carburant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        vehicule_id: this.form.vehicule_id || null,
        litres: this.form.litres ? parseFloat(this.form.litres as string) : null,
        montant: parseFloat(this.form.montant as string),
        kilometrage: this.form.kilometrage ? parseInt(this.form.kilometrage as string) : null,
        date_remplissage: this.form.date_remplissage,
        notes: this.form.notes
      })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.succes = '✅ Carburant ajouté avec succès !';
        this.showForm = false;
        this.resetForm();
        this.chargerDonnees();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur';
      }
      this.cdr.detectChanges();
    }).catch(() => {
      this.loadingSave = false;
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
    });
  }

  resetForm() {
    this.form = {
      vehicule_id: this.vehicule?.id || '',
      litres: '',
      montant: '',
      kilometrage: '',
      date_remplissage: new Date().toISOString().split('T')[0],
      notes: ''
    };
  }

  getConsommation(): string {
    if (!this.stats.total_litres || !this.stats.total_depense) return '—';
    const prixParLitre = this.stats.total_depense / this.stats.total_litres;
    return prixParLitre.toFixed(0) + ' F/L';
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
      'profil': '/profil-livreur', 'parametres': '/profil-livreur',
      'messagerie': '/messagerie-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}