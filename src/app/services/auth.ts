import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseUrl = 'http://localhost:3000/api/auth';
  private utilisateurSubject = new BehaviorSubject<any>(null);
  public utilisateur$ = this.utilisateurSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Charger l'utilisateur depuis localStorage au démarrage
    const user = localStorage.getItem('utilisateur');
    if (user) {
      this.utilisateurSubject.next(JSON.parse(user));
    }
  }

  // INSCRIPTION
  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('utilisateur', JSON.stringify(res.utilisateur));
          this.utilisateurSubject.next(res.utilisateur);
        }
      })
    );
  }

  // CONNEXION
  login(email: string, mot_de_passe: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, { email, mot_de_passe }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('utilisateur', JSON.stringify(res.utilisateur));
          this.utilisateurSubject.next(res.utilisateur);
        }
      })
    );
  }

  // DÉCONNEXION
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.utilisateurSubject.next(null);
    this.router.navigate(['/login']);
  }

  // VÉRIFIER SI CONNECTÉ
  estConnecte(): boolean {
    return !!localStorage.getItem('token');
  }

  // OBTENIR L'UTILISATEUR ACTUEL
  getUtilisateur(): any {
    const user = localStorage.getItem('utilisateur');
    return user ? JSON.parse(user) : null;
  }

  // OBTENIR LE TOKEN
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // VÉRIFIER LE RÔLE
  getRole(): string {
    const user = this.getUtilisateur();
    return user ? user.role : '';
  }

  estAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  estClient(): boolean {
    return this.getRole() === 'client';
  }

  estLivreur(): boolean {
    return this.getRole() === 'livreur';
  }

  estRestaurant(): boolean {
    return this.getRole() === 'restaurant';
  }

  // OBTENIR PROFIL DEPUIS API
  getProfil(): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.get(`${this.baseUrl}/profil`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}