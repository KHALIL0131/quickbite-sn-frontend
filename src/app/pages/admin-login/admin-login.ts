import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {

  onglet = 'connexion'; // 'connexion' ou 'inscription'

  // CONNEXION
  email = '';
  mot_de_passe = '';
  showPassword = false;
  loading = false;
  erreur = '';

  // INSCRIPTION
  prenom = '';
  nom = '';
  emailInscription = '';
  telephone = '';
  mot_de_passe_inscription = '';
  confirmer_mot_de_passe = '';
  codeSecret = '';
  showPasswordInscription = false;
  loadingInscription = false;
  erreurInscription = '';

  private apiUrl = 'http://localhost:3000/api';
  private CODE_SECRET_ADMIN = 'QUICKBITE_ADMIN_2026';

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  changerOnglet(o: string) {
    this.onglet = o;
    this.erreur = '';
    this.erreurInscription = '';
    this.cdr.detectChanges();
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  togglePasswordInscription() { this.showPasswordInscription = !this.showPasswordInscription; }

  // CONNEXION ADMIN
  onSubmit() {
    if (!this.email || !this.mot_de_passe) {
      this.erreur = 'Veuillez remplir tous les champs';
      return;
    }

    this.loading = true;
    this.erreur = '';
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        mot_de_passe: this.mot_de_passe
      })
    })
    .then(res => res.json())
    .then(data => {
      this.loading = false;
      if (data.token) {
        const role = data.utilisateur.role;
        if (role !== 'admin') {
          this.erreur = '⛔ Accès refusé. Réservé aux administrateurs.';
          this.cdr.detectChanges();
          return;
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
        this.cdr.detectChanges();
        this.router.navigate(['/dashboard-admin']);
      } else {
        this.erreur = data.message || 'Email ou mot de passe incorrect';
        this.cdr.detectChanges();
      }
    })
    .catch(() => {
      this.loading = false;
      this.erreur = 'Erreur de connexion au serveur';
      this.cdr.detectChanges();
    });
  }

  // INSCRIPTION ADMIN
  onInscription() {
    this.erreurInscription = '';

    if (!this.prenom || !this.nom || !this.emailInscription || !this.telephone || !this.mot_de_passe_inscription) {
      this.erreurInscription = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (this.mot_de_passe_inscription !== this.confirmer_mot_de_passe) {
      this.erreurInscription = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.codeSecret !== this.CODE_SECRET_ADMIN) {
      this.erreurInscription = '⛔ Code secret administrateur incorrect';
      return;
    }

    this.loadingInscription = true;
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prenom: this.prenom,
        nom: this.nom,
        email: this.emailInscription,
        telephone: '+221' + this.telephone,
        mot_de_passe: this.mot_de_passe_inscription,
        role: 'admin'
      })
    })
    .then(res => res.json())
    .then(data => {
      this.loadingInscription = false;
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));
        this.cdr.detectChanges();
        this.router.navigate(['/dashboard-admin']);
      } else {
        this.erreurInscription = data.message || 'Erreur lors de l\'inscription';
        this.cdr.detectChanges();
      }
    })
    .catch(() => {
      this.loadingInscription = false;
      this.erreurInscription = 'Erreur de connexion au serveur';
      this.cdr.detectChanges();
    });
  }

  goToForgot() {
  this.router.navigate(['/mot-de-passe-oublie'], {
    queryParams: { from: 'admin-login' }
  });
}
  goToAccueil() { this.router.navigate(['/accueil']); }
}