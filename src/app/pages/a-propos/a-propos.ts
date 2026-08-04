import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-a-propos',
  imports: [CommonModule],
  templateUrl: './a-propos.html',
  styleUrl: './a-propos.scss'
})
export class APropos implements OnInit {

  menuOpen = false;

  particles = Array.from({ length: 20 }, (_, i) => ({
    left: Math.random() * 100 + '%',
    top: Math.random() * 100 + '%',
    delay: Math.random() * 5 + 's',
    size: Math.floor(Math.random() * 6 + 3) + 'px'
  }));

  zones = [
    { nom: 'Dakar Plateau', temps: '15-20 min' },
    { nom: 'Médina', temps: '20-25 min' },
    { nom: 'HLM', temps: '25-30 min' },
    { nom: 'Sacré-Cœur', temps: '20-25 min' },
    { nom: 'Almadies', temps: '25-35 min' },
    { nom: 'Ouakam', temps: '25-30 min' },
    { nom: 'Ngor', temps: '30-35 min' },
    { nom: 'Yoff', temps: '25-30 min' },
    { nom: 'Point E', temps: '15-20 min' },
    { nom: 'Mermoz', temps: '20-25 min' },
    { nom: 'Liberté 6', temps: '20-25 min' },
    { nom: 'Grand Dakar', temps: '25-30 min' }
  ];

  temoignages = [
    {
      texte: 'QuickBite SN a révolutionné mes repas du midi. Livraison toujours à l\'heure et plats délicieux !',
      nom: 'Aminata Diallo',
      ville: 'Dakar Plateau',
      initiales: 'AD'
    },
    {
      texte: 'Le paiement Wave est tellement pratique. Je commande tous les jours depuis l\'application !',
      nom: 'Moussa Ndiaye',
      ville: 'Médina',
      initiales: 'MN'
    },
    {
      texte: 'Excellent service ! Le thiéboudiène de Chez Maman Fatou arrive encore chaud. Bravo l\'équipe !',
      nom: 'Fatou Sow',
      ville: 'Sacré-Cœur',
      initiales: 'FS'
    },
    {
      texte: 'Enfin une vraie appli de livraison sénégalaise. Je recommande à tous mes amis !',
      nom: 'Ibrahima Ba',
      ville: 'Almadies',
      initiales: 'IB'
    },
    {
      texte: 'Suivi en temps réel, livreur sympa, plats chauds. QuickBite SN c\'est vraiment top !',
      nom: 'Seynabou Fall',
      ville: 'Point E',
      initiales: 'SF'
    },
    {
      texte: 'Le meilleur service de livraison à Dakar. Prix raisonnables et qualité au rendez-vous.',
      nom: 'Omar Diop',
      ville: 'Mermoz',
      initiales: 'OD'
    }
  ];

  faqs = [
    {
      question: 'Comment passer une commande sur QuickBite SN ?',
      reponse: 'C\'est simple ! Créez un compte, choisissez votre restaurant, ajoutez vos plats au panier, entrez votre adresse et payez via Wave, Orange Money, carte ou espèces. Votre commande sera livrée en 30 minutes.',
      ouvert: true
    },
    {
      question: 'Quels sont les modes de paiement acceptés ?',
      reponse: 'Nous acceptons Wave, Orange Money, carte bancaire (Visa, Mastercard) et le paiement en espèces à la livraison. Tous les paiements sont 100% sécurisés.',
      ouvert: false
    },
    {
      question: 'Dans quelles zones livrez-vous à Dakar ?',
      reponse: 'Nous livrons dans tout Dakar : Plateau, Médina, HLM, Sacré-Cœur, Almadies, Ouakam, Ngor, Yoff, Point E, Mermoz, Liberté 6 et Grand Dakar. La couverture s\'étend continuellement.',
      ouvert: false
    },
    {
      question: 'Quel est le délai de livraison moyen ?',
      reponse: 'Notre délai moyen est de 30 minutes. Cela dépend de votre zone et de la distance avec le restaurant. Vous pouvez suivre votre livreur en temps réel sur la carte.',
      ouvert: false
    },
    {
      question: 'Comment devenir restaurant partenaire ?',
      reponse: 'Contactez-nous via WhatsApp au +221 77 000 00 00 ou par email à contact@quickbite.sn. Notre équipe vous accompagne dans tout le processus d\'intégration.',
      ouvert: false
    },
    {
      question: 'Que faire si ma commande n\'arrive pas ou arrive froide ?',
      reponse: 'Contactez immédiatement notre support via WhatsApp. Nous garantissons un remboursement ou un remplacement en cas de problème. Votre satisfaction est notre priorité.',
      ouvert: false
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {}

  goToAccueil() { this.router.navigate(['/accueil']); }
  goToMenu() { this.router.navigate(['/menu']); }
  goToLogin() { this.router.navigate(['/login']); }
  goToRegister() { this.router.navigate(['/register']); }
  goToPanier() { this.router.navigate(['/panier']); }
}