import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-gains-livreur',
  imports: [CommonModule, FormsModule],
  templateUrl: './gains-livreur.html',
  styleUrl: './gains-livreur.scss'
})
export class GainsLivreur implements OnInit {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;

  gains = {
    total: 0,
    jour: 0,
    semaine: 0,
    mois: 0,
    parJour: [] as any[],
    historique: [] as any[]
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerGains();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

  chargerGains() {
    this.loading = true;

    this.api.get<any>('livreur/gains').subscribe({
      next: (data) => {
        if (data.success && data.data) {
          this.gains = {
            total: data.data.total || 0,
            jour: data.data.jour || 0,
            semaine: data.data.semaine || 0,
            mois: data.data.mois || 0,
            parJour: data.data.parJour || [],
            historique: data.data.historique || []
          };
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.gains = {
          total: 0, jour: 0, semaine: 0, mois: 0,
          parJour: [], historique: []
        };
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getBarHeight(jour: any): string {
    if (!this.gains.parJour || this.gains.parJour.length === 0) return '0%';
    const max = Math.max(...this.gains.parJour.map((j: any) => j.total), 1);
    return Math.round((jour.total / max) * 100) + '%';
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  formaterDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'short', day: '2-digit', month: 'short'
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