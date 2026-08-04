import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {

  // CHAMPS COMMUNS
  prenom = '';
  nom = '';
  email = '';
  telephone = '';
  mot_de_passe = '';
  confirmer_mot_de_passe = '';
  role = 'client';
  adresse = '';
  accepter_conditions = false;

  // CHAMPS RESTAURANT
  nom_restaurant = '';
  description = '';
  type_cuisine = '';
  photoFile: File | null = null;
  photoPreview = '';

  // CHAMPS LIVREUR
  vehicule = 'moto';
  zone_livraison = '';
  cniFile: File | null = null;
  cniPreview = '';

  // ÉTAT
  showPassword = false;
  showConfirm = false;
  loading = false;
  erreur = '';

  // FORCE MOT DE PASSE
  get forceMotDePasse(): number {
    const p = this.mot_de_passe;
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  get forceLabel(): string {
    const f = this.forceMotDePasse;
    if (f <= 1) return 'Faible';
    if (f <= 3) return 'Moyen';
    return 'Fort ✅';
  }

  get forceCouleur(): string {
    const f = this.forceMotDePasse;
    if (f <= 1) return '#E74C3C';
    if (f <= 3) return '#F5A623';
    return '#22A86A';
  }

  constructor(private authService: AuthService, private router: Router) {}

  selectRole(r: string) {
    this.role = r;
    this.erreur = '';
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }

  onPhotoChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.photoFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => { this.photoPreview = e.target.result; };
      reader.readAsDataURL(file);
    }
  }

  onCniChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.cniFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => { this.cniPreview = e.target.result; };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    this.erreur = '';

    // VALIDATIONS COMMUNES
    if (!this.prenom || !this.nom || !this.email || !this.telephone || !this.mot_de_passe) {
      this.erreur = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    if (this.mot_de_passe !== this.confirmer_mot_de_passe) {
      this.erreur = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.forceMotDePasse < 2) {
      this.erreur = 'Votre mot de passe est trop faible. Ajoutez des chiffres et majuscules';
      return;
    }

    if (!this.accepter_conditions) {
      this.erreur = 'Veuillez accepter les conditions d\'utilisation';
      return;
    }

    // VALIDATIONS PAR RÔLE
    if (this.role === 'restaurant' && !this.nom_restaurant) {
      this.erreur = 'Veuillez entrer le nom de votre restaurant';
      return;
    }

    if (this.role === 'livreur' && !this.vehicule) {
      this.erreur = 'Veuillez sélectionner votre type de véhicule';
      return;
    }

    this.loading = true;

    const data: any = {
      prenom: this.prenom,
      nom: this.nom,
      email: this.email,
      telephone: '+221' + this.telephone,
      mot_de_passe: this.mot_de_passe,
      role: this.role,
      adresse: this.adresse
    };

    // Données supplémentaires restaurant
    if (this.role === 'restaurant') {
      data.nom_restaurant = this.nom_restaurant;
      data.description = this.description;
      data.type_cuisine = this.type_cuisine;
    }

    // Données supplémentaires livreur
    if (this.role === 'livreur') {
      data.vehicule = this.vehicule;
      data.zone_livraison = this.zone_livraison;
    }

    this.authService.register(data).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/otp'], {
          queryParams: { email: this.email }
        });
      },
      error: (err) => {
        this.loading = false;
        this.erreur = err.error?.message || 'Erreur lors de l\'inscription';
      }
    });
  }

  goToLogin() { this.router.navigate(['/login']); }
  goToAccueil() { this.router.navigate(['/accueil']); }
}