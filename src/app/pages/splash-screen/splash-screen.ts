import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  imports: [CommonModule],
  templateUrl: './splash-screen.html',
  styleUrl: './splash-screen.scss'
})
export class SplashScreen implements OnInit {

  loadingMessage = 'Initialisation de l\'application...';

  private messages = [
    'Initialisation de l\'application...',
    'Connexion au serveur...',
    'Chargement des restaurants...',
    'Vérification de votre position...',
    'Chargement des menus...',
    'Connexion WebSocket...',
    'Prêt à commander ! 🍔'
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < this.messages.length) {
        this.loadingMessage = this.messages[idx];
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.router.navigate(['/accueil']);
        }, 500);
      }
    }, 400);
  }
}