import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-entretien',
  imports: [CommonModule, FormsModule],
  templateUrl: './entretien.html',
  styleUrl: './entretien.scss'
})
export class Entretien implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;
  loadingSave = false;
  showForm = false;
  succes = '';
  erreur = '';

  entretiens: any[] = [];
  stats: any = { total_cout: 0, nombre: 0 };
  vehicule: any = null;

  typesEntretien = [
    'Vidange huile', 'Changement filtre', 'Freins',
    'Pneus', 'Batterie', 'Bougies', 'Courroie',
    'Révision complète', 'Autre'
  ];

  form = {
    vehicule_id: '',
    type_entretien: '',
    description: '',
    cout: '',
    kilometrage: '',
    date_entretien: new Date().toISOString().split('T')[0],
    prochain_entretien: '',
    garage: ''
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

  // Timeout de sécurité 3 secondes
  const timeout = setTimeout(() => {
    this.loading = false;
    this.entretiens = [];
    this.stats = { total_cout: 0, nombre: 0 };
    this.cdr.detectChanges();
  }, 3000);

  // Véhicule
  fetch(`${this.apiUrl}/livreur/vehicule`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.data) {
      this.vehicule = data.data;
      this.form.vehicule_id = data.data.id;
      this.cdr.detectChanges();
    }
  }).catch(() => {});

  // Entretiens
  fetch(`${this.apiUrl}/livreur/entretien`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    clearTimeout(timeout);
    if (data.success) {
      this.entretiens = data.data || [];
      this.stats = data.stats || { total_cout: 0, nombre: 0 };
    } else {
      this.entretiens = [];
      this.stats = { total_cout: 0, nombre: 0 };
    }
    this.loading = false;
    this.cdr.detectChanges();
  }).catch(() => {
    clearTimeout(timeout);
    this.entretiens = [];
    this.stats = { total_cout: 0, nombre: 0 };
    this.loading = false;
    this.cdr.detectChanges();
  });
}
  sauvegarder() {
    if (!this.form.type_entretien || !this.form.date_entretien) {
      this.erreur = 'Type d\'entretien et date requis';
      return;
    }

    this.loadingSave = true;
    this.erreur = '';
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/livreur/entretien`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        vehicule_id: this.form.vehicule_id || null,
        type_entretien: this.form.type_entretien,
        description: this.form.description,
        cout: this.form.cout ? parseFloat(this.form.cout as string) : 0,
        kilometrage: this.form.kilometrage ? parseInt(this.form.kilometrage as string) : null,
        date_entretien: this.form.date_entretien,
        prochain_entretien: this.form.prochain_entretien || null,
        garage: this.form.garage
      })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        this.succes = '✅ Entretien enregistré avec succès !';
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
      type_entretien: '',
      description: '',
      cout: '',
      kilometrage: '',
      date_entretien: new Date().toISOString().split('T')[0],
      prochain_entretien: '',
      garage: ''
    };
  }

  getProchainEntretien(e: any): string {
    if (!e.prochain_entretien) return '—';
    const date = new Date(e.prochain_entretien);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return '⚠️ Dépassé';
    if (diff === 0) return '⚠️ Aujourd\'hui';
    if (diff <= 7) return `⚠️ Dans ${diff} jours`;
    return `Dans ${diff} jours`;
  }

  getAlertClass(e: any): string {
    if (!e.prochain_entretien) return '';
    const date = new Date(e.prochain_entretien);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'urgent';
    if (diff <= 7) return 'warning';
    return '';
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  formaterDate(d: string): string {
    if (!d) return '—';
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
      'profil': '/profil-livreur', 'parametres': '/profil-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
}