import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-zones-livraison',
  imports: [CommonModule, FormsModule],
  templateUrl: './zones-livraison.html',
  styleUrl: './zones-livraison.scss'
})
export class ZonesLivraison implements OnInit {

  admin: any = null;
  sidebarOpen = false;
  loading = true;

  vueActive = 'zones';

  zones: any[] = [];
  zoneSelectionnee: any = null;

  succes = '';
  erreur = '';

  stats = { zones: 0, surface: 0, delai: 0, commandes: 0 };

  livreurs_carte = [
    { top: 38, left: 52, delay: '0s' },
    { top: 55, left: 40, delay: '0.8s' },
    { top: 30, left: 60, delay: '1.5s' }
  ];

  // ══ MODAL CRÉER / MODIFIER ══
  showModal = false;
  modeEdition = false;
  zoneEnEdition: any = null;
  loadingSave = false;
  erreurModal = '';

  form: any = {
    nom: '',
    description: '',
    frais_livraison: 1000,
    min_commande: 0,
    livraison_gratuite_des: 0,
    delai_min: 20,
    delai_max: 35,
    rayon_km: 3,
    couleur: '#22A86A',
    quartiers: '',
    statut: 'active'
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerZones();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  // ══ CHARGER ══
  chargerZones() {
    this.loading = true;
    const token = localStorage.getItem('token');

    const timeout = setTimeout(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }, 6000);

    fetch(`${this.apiUrl}/zones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      clearTimeout(timeout);
      if (data.success) {
        this.zones = (data.data || []).map((z: any, i: number) => ({
          ...z,
          selected: i === 0,
          top: parseFloat(z.pos_top) || 50,
          left: parseFloat(z.pos_left) || 50
        }));
        if (this.zones.length > 0) this.zoneSelectionnee = this.zones[0];
        this.calculerStats();
      }
      this.loading = false;
      this.cdr.detectChanges();
    })
    .catch(() => {
      clearTimeout(timeout);
      this.loading = false;
      this.cdr.detectChanges();
    });
  }

  calculerStats() {
    const actives = this.zones.filter(z => z.statut === 'active');
    this.stats.zones = actives.length;

    this.stats.surface = Math.round(
      this.zones.reduce((s, z) => {
        const r = parseFloat(z.rayon_km) || 0;
        return s + (Math.PI * r * r);
      }, 0)
    );

    const delais = actives.map(z =>
      ((parseInt(z.delai_min) || 0) + (parseInt(z.delai_max) || 0)) / 2
    );
    this.stats.delai = delais.length > 0
      ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length)
      : 0;

    this.stats.commandes = this.zones.reduce((s, z) => s + (z.commandes || 0), 0);
  }

  selectionnerZone(zone: any) {
    this.zones.forEach(z => z.selected = false);
    zone.selected = true;
    this.zoneSelectionnee = zone;
    this.cdr.detectChanges();
  }

  // ══ OUVRIR CRÉATION ══
  ouvrirCreation() {
    this.modeEdition = false;
    this.zoneEnEdition = null;
    this.form = {
      nom: '',
      description: '',
      frais_livraison: 1000,
      min_commande: 0,
      livraison_gratuite_des: 0,
      delai_min: 20,
      delai_max: 35,
      rayon_km: 3,
      couleur: '#22A86A',
      quartiers: '',
      statut: 'active'
    };
    this.erreurModal = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  // ══ OUVRIR MODIFICATION ══
  ouvrirModification(zone: any, event?: Event) {
    if (event) event.stopPropagation();
    this.modeEdition = true;
    this.zoneEnEdition = zone;
    this.form = {
      nom: zone.nom || '',
      description: zone.description || '',
      frais_livraison: parseFloat(zone.frais_livraison) || 0,
      min_commande: parseFloat(zone.min_commande) || 0,
      livraison_gratuite_des: parseFloat(zone.livraison_gratuite_des) || 0,
      delai_min: parseInt(zone.delai_min) || 20,
      delai_max: parseInt(zone.delai_max) || 35,
      rayon_km: parseFloat(zone.rayon_km) || 0,
      couleur: zone.couleur || '#22A86A',
      quartiers: zone.quartiers || '',
      statut: zone.statut || 'active'
    };
    this.erreurModal = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  fermerModal() {
    this.showModal = false;
    this.modeEdition = false;
    this.zoneEnEdition = null;
    this.erreurModal = '';
    this.cdr.detectChanges();
  }

  // ══ SAUVEGARDER ══
  sauvegarder() {
    if (!this.form.nom || !this.form.nom.trim()) {
      this.erreurModal = 'Le nom de la zone est obligatoire';
      this.cdr.detectChanges();
      return;
    }

    if (this.form.frais_livraison === null ||
        this.form.frais_livraison === undefined ||
        this.form.frais_livraison === '') {
      this.erreurModal = 'Le prix de livraison est obligatoire';
      this.cdr.detectChanges();
      return;
    }

    if (parseFloat(this.form.frais_livraison) < 0) {
      this.erreurModal = 'Le prix ne peut pas être négatif';
      this.cdr.detectChanges();
      return;
    }

    if (parseInt(this.form.delai_min) > parseInt(this.form.delai_max)) {
      this.erreurModal = 'Le délai minimum doit être inférieur au délai maximum';
      this.cdr.detectChanges();
      return;
    }

    this.loadingSave = true;
    this.erreurModal = '';
    this.cdr.detectChanges();

    const token = localStorage.getItem('token');
    const url = this.modeEdition
      ? `${this.apiUrl}/zones/${this.zoneEnEdition.id}`
      : `${this.apiUrl}/zones`;
    const methode = this.modeEdition ? 'PUT' : 'POST';

    fetch(url, {
      method: methode,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(this.form)
    })
    .then(res => res.json())
    .then(data => {
      this.loadingSave = false;
      if (data.success) {
        const nom = this.form.nom;
        const ancien = data.ancien_prix;
        const nouveau = data.nouveau_prix;

        if (this.modeEdition && ancien !== undefined && ancien != nouveau) {
          this.succes =
            `✅ ${nom} modifiée · Prix : ${this.formaterMontant(ancien)} → ${this.formaterMontant(nouveau)}`;
        } else {
          this.succes = this.modeEdition
            ? `✅ Zone "${nom}" modifiée avec succès`
            : `✅ Zone "${nom}" créée avec succès`;
        }

        this.fermerModal();
        this.chargerZones();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 4000);
      } else {
        this.erreurModal = data.message || 'Erreur lors de l\'enregistrement';
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.loadingSave = false;
      this.erreurModal = 'Erreur de connexion au serveur';
      this.cdr.detectChanges();
    });
  }

  // ══ CHANGER STATUT ══
  changerStatut(zone: any, nouveau: string, event?: Event) {
    if (event) event.stopPropagation();

    if (nouveau === 'inactive' && zone.commandes > 0) {
      if (!confirm(
        `⚠️ Cette zone a ${zone.commandes} commande(s).\n\n` +
        `La désactiver empêchera les nouvelles commandes, ` +
        `mais les commandes en cours resteront valides.\n\nContinuer ?`
      )) return;
    }

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/zones/${zone.id}/statut`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ statut: nouveau })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        zone.statut = nouveau;
        const label: any = {
          'active': 'activée',
          'limitee': 'passée en accès limité',
          'inactive': 'désactivée'
        };
        this.succes = `✅ ${zone.nom} ${label[nouveau]}`;
        this.calculerStats();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Erreur';
        setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
    });
  }

  toggleActivation(zone: any, event?: Event) {
    const nouveau = zone.statut === 'active' ? 'inactive' : 'active';
    this.changerStatut(zone, nouveau, event);
  }

  // ══ SUPPRIMER ══
  supprimerZone(zone: any, event?: Event) {
    if (event) event.stopPropagation();

    if (!confirm(
      `⚠️ Supprimer définitivement "${zone.nom}" ?\n\n` +
      `Cette action est irréversible.`
    )) return;

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/zones/${zone.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.zones = this.zones.filter(z => z.id !== zone.id);
        if (this.zoneSelectionnee?.id === zone.id) {
          this.zoneSelectionnee = this.zones[0] || null;
        }
        this.succes = `✅ Zone "${zone.nom}" supprimée`;
        this.calculerStats();
        setTimeout(() => { this.succes = ''; this.cdr.detectChanges(); }, 3000);
      } else {
        this.erreur = data.message || 'Suppression impossible';
        setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 5000);
      }
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.erreur = 'Erreur de connexion';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
    });
  }

  // ══ AFFICHAGE ══
  getStatutClass(statut: string): string {
    const map: any = {
      'active': 'zcs-active',
      'limitee': 'zcs-limited',
      'inactive': 'zcs-inactive'
    };
    return map[statut] || 'zcs-inactive';
  }

  getStatutLabel(statut: string): string {
    const map: any = {
      'active': '● Active',
      'limitee': '⚡ Limitée',
      'inactive': '○ Inactive'
    };
    return map[statut] || statut;
  }

  getZoneCircleClass(couleur: string): string {
    if (couleur === '#22A86A') return 'zc-green';
    if (couleur === '#F5A623') return 'zc-orange';
    if (couleur === '#FFD700') return 'zc-yellow';
    return 'zc-blue';
  }

  getResumeTarif(z: any): string {
    const frais = parseFloat(z.frais_livraison) || 0;
    const gratuitDes = parseFloat(z.livraison_gratuite_des) || 0;
    const min = parseFloat(z.min_commande) || 0;

    let txt = frais === 0
      ? 'Livraison gratuite'
      : `${this.formaterMontant(frais)} de livraison`;

    if (gratuitDes > 0) {
      txt += ` · Offerte dès ${this.formaterMontant(gratuitDes)}`;
    }
    if (min > 0) {
      txt += ` · Min. ${this.formaterMontant(min)}`;
    }
    return txt;
  }

  getDelai(z: any): string {
    return `${z.delai_min}-${z.delai_max} min`;
  }

  getQuartiers(z: any): string[] {
    if (!z.quartiers) return [];
    return z.quartiers.split(',').map((q: string) => q.trim()).filter((q: string) => q);
  }

  formaterMontant(m: any): string {
    const v = parseFloat(m);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  changerVue(vue: string) {
    this.vueActive = vue;
    this.cdr.detectChanges();
  }

 // ══════════════════════════════════
  // EXPORTS PDF / EXCEL / CSV
  // ══════════════════════════════════
  private construireOptionsZones(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const mt = (v: any) => this.exportService.montant(v);

    const actives = this.zones.filter(z => z.statut === 'active');
    const prixMoyen = this.zones.length > 0
      ? this.zones.reduce((s, z) => s + (parseFloat(z.frais_livraison) || 0), 0) / this.zones.length
      : 0;

    return {
      titre: 'Zones de livraison',
      sousTitre: `Grille tarifaire au ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `quickbite-zones-${dateFichier}`,
      orientation: 'landscape',
      donnees: this.zones,
      colonnes: [
        { cle: 'nom', titre: 'Zone', largeur: 26 },
        { cle: 'frais_livraison', titre: 'Prix livraison', largeur: 18, format: mt },
        { cle: 'min_commande', titre: 'Min. commande', largeur: 18,
          format: (v: any) => parseFloat(v) > 0 ? mt(v) : 'Aucun' },
        { cle: 'livraison_gratuite_des', titre: 'Gratuite dès', largeur: 18,
          format: (v: any) => parseFloat(v) > 0 ? mt(v) : 'Jamais' },
        { cle: 'delai_min', titre: 'Délai', largeur: 14,
          format: (v: any, l: any) => `${v}-${l.delai_max} min` },
        { cle: 'rayon_km', titre: 'Rayon', largeur: 12,
          format: (v: any) => `${v || 0} km` },
        { cle: 'commandes', titre: 'Commandes', largeur: 14,
          format: (v: any) => String(v || 0) },
        { cle: 'statut', titre: 'Statut', largeur: 14,
          format: (v: any) => {
            const map: any = { 'active': 'Active', 'limitee': 'Limitée', 'inactive': 'Inactive' };
            return map[v] || v;
          }
        },
        { cle: 'quartiers', titre: 'Quartiers couverts', largeur: 40,
          format: (v: any) => v || '—' }
      ],
      resume: [
        { label: 'Zones', valeur: String(this.zones.length) },
        { label: 'Actives', valeur: String(actives.length) },
        { label: 'Prix moyen', valeur: mt(prixMoyen) },
        { label: 'Surface', valeur: `${this.stats.surface} km²` },
        { label: 'Délai moyen', valeur: `${this.stats.delai} min` },
        { label: 'Commandes', valeur: String(this.stats.commandes) }
      ]
    };
  }

  exporter() {
    this.exporterPDF();
  }

  exporterPDF() {
    if (this.zones.length === 0) {
      this.erreur = 'Aucune zone à exporter';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsZones());
  }

  exporterExcel() {
    if (this.zones.length === 0) {
      this.erreur = 'Aucune zone à exporter';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsZones());
  }

  exporterCSV() {
    if (this.zones.length === 0) {
      this.erreur = 'Aucune zone à exporter';
      this.cdr.detectChanges();
      setTimeout(() => { this.erreur = ''; this.cdr.detectChanges(); }, 3000);
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsZones());
  }
  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; this.cdr.detectChanges(); }
  fermerSidebar() { this.sidebarOpen = false; this.cdr.detectChanges(); }

  naviguer(page: string) {
    this.fermerSidebar();
    const routes: any = {
      'dashboard': '/dashboard-admin',
      'commandes': '/gestion-commandes',
      'menu': '/gestion-menu',
      'utilisateurs': '/utilisateurs',
      'livreurs': '/livreurs',
      'finances': '/finances',
      'zones': '/zones-livraison',
      'statistiques': '/statistiques',
      'avis': '/avis-clients',
      'rapports': '/rapports',
      'parametres': '/parametres',
      'notifications': '/notifications'
    };
    if (routes[page]) this.router.navigate([routes[page]]);
  }

  deconnecter() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    this.router.navigate(['/admin-login']);
  }
}