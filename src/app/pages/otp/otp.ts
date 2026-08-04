import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-otp',
  imports: [CommonModule, FormsModule],
  templateUrl: './otp.html',
  styleUrl: './otp.scss'
})
export class Otp implements OnInit, OnDestroy {

  email = '';
  digits = ['', '', '', '', '', ''];
  methodActive = 'sms';
  loading = false;
  erreur = '';
  success = false;

  // TIMER
  secondes = 120;
  timerInterval: any;
  peutRenvoyer = false;

  private apiUrl = 'http://localhost:3000/api';

  get timerAffiche(): string {
    const m = Math.floor(this.secondes / 60).toString().padStart(2, '0');
    const s = (this.secondes % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  get codeComplet(): string {
    return this.digits.join('');
  }

  get codeValide(): boolean {
    return this.digits.every(d => d !== '');
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
    });
    this.demarrerTimer();
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
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
    }, 1000);
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

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const chiffres = paste.replace(/\D/g, '').slice(0, 6).split('');
    chiffres.forEach((c, i) => {
      if (i < 6) this.digits[i] = c;
    });
    const inputs = document.querySelectorAll('.otp-digit');
    const lastIndex = Math.min(chiffres.length, 5);
    (inputs[lastIndex] as HTMLInputElement)?.focus();
  }

  verifier() {
    if (!this.codeValide) {
      this.erreur = 'Veuillez entrer le code complet à 6 chiffres';
      return;
    }

    this.loading = true;
    this.erreur = '';

    this.http.post(`${this.apiUrl}/otp/verifier`, {
      email: this.email,
      code: this.codeComplet
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.success = true;
        setTimeout(() => {
          this.router.navigate(['/accueil']);
        }, 2500);
      },
      error: (err) => {
        this.loading = false;
        this.erreur = err.error?.message || 'Code incorrect ou expiré';
        this.digits = ['', '', '', '', '', ''];
        const firstInput = document.querySelector('.otp-digit') as HTMLInputElement;
        firstInput?.focus();

        if (err.error?.trop_tentatives) {
          setTimeout(() => {
            this.router.navigate(['/register']);
          }, 2000);
        }
      }
    });
  }

  renvoyer() {
    if (!this.peutRenvoyer) return;

    this.http.post(`${this.apiUrl}/otp/renvoyer`, {
      email: this.email
    }).subscribe({
      next: () => {
        this.digits = ['', '', '', '', '', ''];
        this.erreur = '';
        this.demarrerTimer();
      },
      error: (err) => {
        this.erreur = err.error?.message || 'Erreur renvoi code';
      }
    });
  }

  changerMethode(m: string) {
    this.methodActive = m;
  }

  retour() {
    this.router.navigate(['/register']);
  }

  goToAccueil() {
    this.router.navigate(['/accueil']);
  }
}