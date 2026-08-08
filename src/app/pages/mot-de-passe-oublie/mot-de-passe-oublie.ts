import { environment } from '../../../environments/environment';
import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-mot-de-passe-oublie',
  imports: [CommonModule, FormsModule],
  templateUrl: './mot-de-passe-oublie.html',
  styleUrl: './mot-de-passe-oublie.scss',
  standalone: true
})
export class MotDePasseOublie {

  etape = 1;
  methode = 'email';
  email = '';
  digits = ['', '', '', '', '', ''];
  nouveau_mot_de_passe = '';
  confirmer_mot_de_passe = '';
  loading = false;
  erreur = '';
  showPassword = false;
  showConfirm = false;
  secondes = 120;
  timerInterval: any;
  peutRenvoyer = false;
  provenance = 'login';

  private apiUrl = environment.apiUrl;

  get timerAffiche(): string {
    const m = Math.floor(this.secondes / 60).toString().padStart(2, '0');
    const s = (this.secondes % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get codeComplet(): string { return this.digits.join(''); }
  get codeValide(): boolean { return this.digits.every(d => d !== ''); }

  get forceMotDePasse(): number {
    const p = this.nouveau_mot_de_passe;
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    this.route.queryParams.subscribe(params => {
      this.provenance = params['from'] || 'login';
    });
  }

  allerEtape(n: number) {
    this.etape = n;
    this.loading = false;
    this.erreur = '';
    this.cdr.detectChanges();
  }

  envoyerCode() {
    if (!this.email) {
      this.erreur = 'Veuillez entrer votre email';
      return;
    }

    this.loading = true;
    this.erreur = '';
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/otp/reset/envoyer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email })
    })
    .then(res => res.json())
    .then(data => {
      this.allerEtape(2);
      this.demarrerTimer();
    })
    .catch(err => {
      this.loading = false;
      this.erreur = 'Erreur connexion serveur';
      this.cdr.detectChanges();
    });
  }

  verifierCode() {
    if (!this.codeValide) {
      this.erreur = 'Veuillez entrer le code complet à 6 chiffres';
      return;
    }

    this.loading = true;
    this.erreur = '';
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/otp/reset/verifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, code: this.codeComplet })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        clearInterval(this.timerInterval);
        this.allerEtape(3);
      } else {
        this.loading = false;
        this.erreur = data.message || 'Code incorrect ou expiré';
        this.digits = ['', '', '', '', '', ''];
        this.cdr.detectChanges();
      }
    })
    .catch(() => {
      this.loading = false;
      this.erreur = 'Erreur connexion serveur';
      this.cdr.detectChanges();
    });
  }

  reinitialiser() {
    if (!this.nouveau_mot_de_passe || !this.confirmer_mot_de_passe) {
      this.erreur = 'Veuillez remplir les deux champs';
      return;
    }

    if (this.nouveau_mot_de_passe !== this.confirmer_mot_de_passe) {
      this.erreur = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.forceMotDePasse < 2) {
      this.erreur = 'Mot de passe trop faible';
      return;
    }

    this.loading = true;
    this.erreur = '';
    this.cdr.detectChanges();

    fetch(`${this.apiUrl}/otp/reset/nouveau-mdp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        code: this.codeComplet,
        nouveau_mot_de_passe: this.nouveau_mot_de_passe
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.allerEtape(4);
      } else {
        this.loading = false;
        this.erreur = data.message || 'Erreur serveur';
        this.cdr.detectChanges();
      }
    })
    .catch(() => {
      this.loading = false;
      this.erreur = 'Erreur connexion serveur';
      this.cdr.detectChanges();
    });
  }

  demarrerTimer() {
    this.secondes = 120;
    this.peutRenvoyer = false;
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.secondes--;
      if (this.secondes <= 0) {
        clearInterval(this.timerInterval);
        this.peutRenvoyer = true;
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  renvoyer() {
    if (!this.peutRenvoyer) return;
    this.digits = ['', '', '', '', '', ''];
    this.erreur = '';
    this.envoyerCode();
  }

  onDigitInput(event: any, index: number) {
    const value = event.target.value.replace(/\D/g, '');
    this.digits[index] = value.slice(-1);
    event.target.value = this.digits[index];
    if (this.digits[index] && index < 5) {
      const inputs = document.querySelectorAll('.otp-digit');
      (inputs[index + 1] as HTMLInputElement)?.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      const inputs = document.querySelectorAll('.otp-digit');
      (inputs[index - 1] as HTMLInputElement)?.focus();
      this.digits[index - 1] = '';
    }
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirm() { this.showConfirm = !this.showConfirm; }

  goToLogin() {
    if (this.provenance === 'admin-login') {
      this.router.navigate(['/admin-login']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  goToAccueil() { this.router.navigate(['/accueil']); }
}