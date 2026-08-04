import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: 'client' | 'livreur' | 'admin' | 'restaurant';
  photo?: string;
  adresse?: string;
  ville?: string;
  est_verifie?: number;
  est_actif?: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {

  private router = inject(Router);

  private _utilisateur = signal<Utilisateur | null>(this.lireUtilisateur());
  private _token = signal<string | null>(localStorage.getItem('token'));

  // ══ LECTURE SEULE ══
  readonly utilisateur = this._utilisateur.asReadonly();
  readonly token = this._token.asReadonly();

  // ══ VALEURS DÉRIVÉES ══
  readonly estConnecte = computed(() =>
    this._token() !== null && this._utilisateur() !== null
  );

  readonly role = computed(() => this._utilisateur()?.role || null);

  readonly estAdmin = computed(() => this.role() === 'admin');
  readonly estLivreur = computed(() => this.role() === 'livreur');
  readonly estClient = computed(() => this.role() === 'client');

  readonly nomComplet = computed(() => {
    const u = this._utilisateur();
    if (!u) return '';
    return `${u.prenom || ''} ${u.nom || ''}`.trim();
  });

  readonly initiales = computed(() => {
    const u = this._utilisateur();
    if (!u) return '?';
    return ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase();
  });

  // ══ ACTIONS ══

  connecter(token: string, utilisateur: Utilisateur) {
    localStorage.setItem('token', token);
    localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
    this._token.set(token);
    this._utilisateur.set(utilisateur);
  }

  mettreAJourProfil(donnees: Partial<Utilisateur>) {
    const actuel = this._utilisateur();
    if (!actuel) return;
    const maj = { ...actuel, ...donnees };
    localStorage.setItem('utilisateur', JSON.stringify(maj));
    this._utilisateur.set(maj);
  }

  deconnecter(redirection: string = '/login') {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this._token.set(null);
    this._utilisateur.set(null);
    this.router.navigate([redirection]);
  }

  aLeRole(roles: string[]): boolean {
    const r = this.role();
    return r !== null && roles.includes(r);
  }

  // ══ PERSISTANCE ══
  private lireUtilisateur(): Utilisateur | null {
    try {
      const brut = localStorage.getItem('utilisateur');
      return brut ? JSON.parse(brut) : null;
    } catch (e) {
      localStorage.removeItem('utilisateur');
      return null;
    }
  }
}