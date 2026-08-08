import { environment } from '../../../environments/environment';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-carte-livreur',
  imports: [CommonModule, FormsModule],
  templateUrl: './carte-livreur.html',
  styleUrl: './carte-livreur.scss'
})
export class CarteLivreur implements OnInit, OnDestroy {

  livreur: any = null;
  sidebarOpen = false;
  loading = true;

  // GPS
  positionActuelle: any = null;
  erreurGPS = '';
  suiviActif = false;
  derniereMaj = '';

  // COMMANDE EN COURS
  commandeEnCours: any = null;

  // MAP
  private map: any = null;
  private markerLivreur: any = null;
  private markerRestaurant: any = null;
  private markerClient: any = null;
  private watchId: any = null;
  private intervalEnvoi: any = null;

  private apiUrl = environment.apiUrl;

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerCommandeEnCours();
  }

  ngOnDestroy() {
    this.arreterSuivi();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/login']); return; }
    this.livreur = JSON.parse(user);
  }

  chargerCommandeEnCours() {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/commandes?statut=en_livraison`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data.length > 0) {
        this.commandeEnCours = data.data.find((c: any) =>
          c.livreur_id === this.livreur.id
        ) || null;
      }
      this.loading = false;
      this.cdr.detectChanges();
      // Initialiser la carte après chargement
      setTimeout(() => this.initialiserCarte(), 300);
    }).catch(() => {
      this.loading = false;
      this.cdr.detectChanges();
      setTimeout(() => this.initialiserCarte(), 300);
    });
  }

  initialiserCarte() {
    const L = (window as any).L;
    if (!L) { this.erreurGPS = 'Leaflet non chargé'; return; }

    const mapEl = document.getElementById('map');
    if (!mapEl || this.map) return;

    // Centre sur Dakar par défaut
    this.map = L.map('map').setView([14.6937, -17.4441], 13);

    // Couche OpenStreetMap GRATUITE
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Icône livreur personnalisée
    const iconLivreur = L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, #F5A623, #FFD700);
        width: 42px; height: 42px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(245,166,35,0.6);
      ">🛵</div>`,
      className: '',
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    // Icône restaurant
    const iconResto = L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, #22A86A, #144D35);
        width: 38px; height: 38px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(34,168,106,0.5);
      ">🏪</div>`,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    // Icône client
    const iconClient = L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, #2563EB, #1E3A5F);
        width: 38px; height: 38px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(37,99,235,0.5);
      ">📍</div>`,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 38]
    });

    // Si commande en cours, ajouter marqueurs restaurant et client
    if (this.commandeEnCours) {
      // Ajouter marqueur restaurant (coordonnées approximatives Dakar)
      this.markerRestaurant = L.marker([14.6937, -17.4441], { icon: iconResto })
        .addTo(this.map)
        .bindPopup(`<b>🏪 ${this.commandeEnCours.restaurant_nom}</b><br>Restaurant`);
    }

    // Démarrer le suivi GPS automatiquement
    this.demarrerSuivi();
  }

  demarrerSuivi() {
    if (!navigator.geolocation) {
      this.erreurGPS = 'GPS non disponible sur ce navigateur';
      this.cdr.detectChanges();
      return;
    }

    const L = (window as any).L;
    this.suiviActif = true;
    this.erreurGPS = '';

    // Options GPS haute précision
    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    // Surveiller la position en continu
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const vitesse = position.coords.speed || 0;
        const precision = position.coords.accuracy;

        this.positionActuelle = { lat, lng, vitesse, precision };
        this.derniereMaj = new Date().toLocaleTimeString('fr-FR');

        // Mettre à jour ou créer le marqueur livreur
        if (this.map && L) {
          const iconLivreur = L.divIcon({
            html: `<div style="
              background: linear-gradient(135deg, #F5A623, #FFD700);
              width: 42px; height: 42px; border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              font-size: 22px; border: 3px solid #FFFFFF;
              box-shadow: 0 4px 12px rgba(245,166,35,0.6);
              animation: pulse 1.5s infinite;
            ">🛵</div>`,
            className: '',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });

          if (this.markerLivreur) {
            this.markerLivreur.setLatLng([lat, lng]);
          } else {
            this.markerLivreur = L.marker([lat, lng], { icon: iconLivreur })
              .addTo(this.map)
              .bindPopup(`<b>🛵 Votre position</b><br>
                Lat: ${lat.toFixed(6)}<br>
                Lng: ${lng.toFixed(6)}<br>
                Précision: ±${precision.toFixed(0)}m`);
          }

          // Centrer la carte sur la position
          this.map.setView([lat, lng], 15);

          // Cercle de précision
          if ((this as any).cercle) {
            (this as any).cercle.setLatLng([lat, lng]).setRadius(precision);
          } else {
            (this as any).cercle = L.circle([lat, lng], {
              radius: precision,
              color: '#F5A623',
              fillColor: '#F5A623',
              fillOpacity: 0.08,
              weight: 1
            }).addTo(this.map);
          }
        }

        this.cdr.detectChanges();
      },
      (error) => {
        switch (error.code) {
          case 1: this.erreurGPS = '❌ Accès GPS refusé. Autorisez la localisation dans votre navigateur.'; break;
          case 2: this.erreurGPS = '❌ Position GPS indisponible. Vérifiez votre connexion.'; break;
          case 3: this.erreurGPS = '⏱ Délai GPS dépassé. Réessayez.'; break;
          default: this.erreurGPS = '❌ Erreur GPS inconnue.';
        }
        this.suiviActif = false;
        this.cdr.detectChanges();
      },
      options
    );

    // Envoyer position au backend toutes les 10 secondes
    this.intervalEnvoi = setInterval(() => {
      if (this.positionActuelle) {
        this.envoyerPosition();
      }
    }, 10000);

    // Premier envoi immédiat
    setTimeout(() => {
      if (this.positionActuelle) this.envoyerPosition();
    }, 2000);
  }

  envoyerPosition() {
    if (!this.positionActuelle) return;
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/livreur/position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: this.positionActuelle.lat,
        longitude: this.positionActuelle.lng,
        vitesse: this.positionActuelle.vitesse,
        precision_gps: this.positionActuelle.precision
      })
    }).catch(() => {});
  }

  arreterSuivi() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.intervalEnvoi) {
      clearInterval(this.intervalEnvoi);
      this.intervalEnvoi = null;
    }
    this.suiviActif = false;

    // Désactiver position dans backend
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/livreur/position/desactiver`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    }).catch(() => {});

    this.cdr.detectChanges();
  }

  centrerSurMoi() {
    if (this.positionActuelle && this.map) {
      this.map.setView([this.positionActuelle.lat, this.positionActuelle.lng], 16);
    }
  }

  formaterVitesse(v: number): string {
    if (!v) return '0 km/h';
    return Math.round(v * 3.6) + ' km/h';
  }

  getInitiales(): string {
    if (!this.livreur) return 'L';
    return ((this.livreur.prenom?.[0] || '') + (this.livreur.nom?.[0] || '')).toUpperCase();
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-livreur', 'livraisons': '/mes-livraisons',
      'historique': '/historique-livreur', 'gains': '/gains-livreur',
      'carte': '/carte-livreur', 'moto': '/mon-moto',
      'carburant': '/carburant', 'entretien': '/entretien',
      'profil': '/profil-livreur', 'parametres': '/profil-livreur',
      'messagerie': '/messagerie-livreur'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    this.arreterSuivi();
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/login']);
  }
} 