import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { identifiantValidator, motDePasseFortValidator } from '../../validators/identifiant.validator';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {

  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  loginForm!: FormGroup;

  showPassword = false;
  loading = false;
  erreur = '';
  urlRetour = '';

  ngOnInit() {
    this.construireFormulaire();
    this.recupererUrlRetour();
    this.preRemplirIdentifiant();
  }

  // ══ CONSTRUCTION DU FORMULAIRE ══
  construireFormulaire() {
    this.loginForm = this.fb.group({
      identifiant: ['', [
        Validators.required,
        identifiantValidator()
      ]],
      mot_de_passe: ['', [
        Validators.required,
        motDePasseFortValidator(6)
      ]],
      rememberMe: [false]
    });

    // L'erreur serveur disparaît dès que l'utilisateur corrige
    this.loginForm.valueChanges.subscribe(() => {
      if (this.erreur) {
        this.erreur = '';
        this.cdr.detectChanges();
      }
    });
  }

  // ══ URL DE RETOUR (posée par authGuard) ══
  recupererUrlRetour() {
    this.route.queryParams.subscribe(params => {
      this.urlRetour = params['retour'] || '';
    });
  }

  // ══ PRÉ-REMPLISSAGE SI « SE SOUVENIR DE MOI » ══
  preRemplirIdentifiant() {
    const memorise = localStorage.getItem('identifiant_memorise');
    if (memorise) {
      this.loginForm.patchValue({
        identifiant: memorise,
        rememberMe: true
      });
    }
  }

  // ══ RACCOURCIS POUR LE TEMPLATE ══
  get identifiant() { return this.loginForm.get('identifiant'); }
  get motDePasse() { return this.loginForm.get('mot_de_passe'); }

  get identifiantInvalide(): boolean {
    const c = this.identifiant;
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  get motDePasseInvalide(): boolean {
    const c = this.motDePasse;
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  get messageIdentifiant(): string {
    const c = this.identifiant;
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Ce champ est obligatoire';
    if (c.errors['identifiantInvalide']) return 'Entrez un email valide ou un numéro sénégalais';
    return '';
  }

  get messageMotDePasse(): string {
    const c = this.motDePasse;
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Le mot de passe est obligatoire';

    const faible = c.errors['motDePasseFaible'];
    if (faible) {
      if (faible.tropCourt) {
        return `Minimum ${faible.tropCourt.requis} caractères (${faible.tropCourt.actuel} saisis)`;
      }
      if (faible.sansChiffre) {
        return 'Le mot de passe doit contenir au moins un chiffre';
      }
    }
    return '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // ══ SOUMISSION ══
  onSubmit() {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.erreur = 'Veuillez corriger les champs en rouge';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.erreur = '';
    this.cdr.detectChanges();

    const { identifiant, mot_de_passe, rememberMe } = this.loginForm.value;

    this.api.post<any>('auth/login', {
      email: identifiant,
      mot_de_passe: mot_de_passe
    }).subscribe({
      next: (data) => {
        this.loading = false;

        if (!data.token) {
          this.erreur = data.message || 'Email ou mot de passe incorrect';
          this.cdr.detectChanges();
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur));

        if (rememberMe) {
          localStorage.setItem('identifiant_memorise', identifiant);
        } else {
          localStorage.removeItem('identifiant_memorise');
        }

        this.redirigerApresConnexion(data.utilisateur.role);
      },
      error: (err) => {
        this.loading = false;
        this.erreur = err?.message || 'Email ou mot de passe incorrect';
        this.cdr.detectChanges();
      }
    });
  }

  // ══ REDIRECTION SELON LE RÔLE ══
  private redirigerApresConnexion(role: string) {
    // Priorité à l'URL demandée avant la redirection du Guard
    if (this.urlRetour) {
      this.router.navigateByUrl(this.urlRetour);
      return;
    }

    const destinations: any = {
      'admin': '/dashboard-admin',
      'restaurant': '/dashboard-admin',
      'livreur': '/dashboard-livreur',
      'client': '/accueil'
    };

    this.router.navigate([destinations[role] || '/accueil']);
  }

  goToRegister() { this.router.navigate(['/register']); }

  goToForgot() {
    this.router.navigate(['/mot-de-passe-oublie'], {
      queryParams: { from: 'login' }
    });
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
}