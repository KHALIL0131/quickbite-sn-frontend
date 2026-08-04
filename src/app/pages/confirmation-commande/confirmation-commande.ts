import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-confirmation-commande',
  imports: [CommonModule],
  templateUrl: './confirmation-commande.html',
  styleUrl: './confirmation-commande.scss'
})
export class ConfirmationCommande implements OnInit {

  utilisateur: any = null;
  commande: any = null;
  commandeId: string | null = null;
  loading = true;

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.chargerUtilisateur();
    this.route.queryParams.subscribe(params => {
      this.commandeId = params['commande_id'];
      if (this.commandeId) this.chargerCommande();
      else { this.loading = false; this.cdr.detectChanges(); }
    });
    setTimeout(() => this.genererConfettis(), 800);
  }

  chargerUtilisateur() {
    const user = localStorage.getItem('utilisateur');
    if (user) this.utilisateur = JSON.parse(user);
  }

  chargerCommande() {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes/${this.commandeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) this.commande = data.data;
      this.loading = false;
      this.cdr.detectChanges();
    }).catch(() => {
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  genererConfettis() {
    const wrap = document.getElementById('confettiWrap');
    if (!wrap) return;
    const colors = ['#F5A623', '#FFD700', '#22A86A', '#2563EB', '#E74C3C', '#FFFFFF'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 5;
      el.style.cssText = `
        position:absolute;
        width:${size}px;
        height:${size * 0.4}px;
        background:${color};
        left:${Math.random() * 100}%;
        top:-20px;
        animation:confettiFall ${Math.random() * 4 + 3}s linear ${Math.random() * 3}s infinite;
        border-radius:2px;
      `;
      wrap.appendChild(el);
    }
  }

  partagerWhatsApp() {
    const msg = encodeURIComponent(
      `🍔 Je viens de commander sur QuickBite SN !\n` +
      `Commande #${this.commande?.numero || ''}\n` +
      `Livraison en 30 min à Dakar 🛵`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  partagerFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=https://quickbite.sn`, '_blank');
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  goToSuivi() {
    this.router.navigate(['/suivi-commande'],
      { queryParams: { commande_id: this.commandeId } });
  }

  goToMenu() { this.router.navigate(['/menu']); }
  goToAccueil() { this.router.navigate(['/accueil']); }
  goToHistorique() { this.router.navigate(['/historique-commandes']); }
}