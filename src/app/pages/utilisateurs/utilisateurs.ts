import { environment } from '../../../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-utilisateurs',
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs.html',
  styleUrl: './utilisateurs.scss'
})
export class Utilisateurs implements OnInit {

  admin: any = null;
  sidebarOpen = false;

  utilisateurs: any[] = [];
  utilisateursFiltres: any[] = [];
  loading = true;

  searchQuery = '';
  ongletActif = 'tous';
  filtreStatut = '';

  stats = { total: 0, clients: 0, livreurs: 0, admins: 0, bloques: 0 };

  page = 1;
  parPage = 6;

  // MODAL PROFIL
  showProfil = false;
  userSelectionne: any = null;

  // CONFIRMATION SUPPRESSION
  showConfirmSuppr = false;
  userASupprimer: any = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerUtilisateurs();
    this.chargerStats();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerUtilisateurs() {
    this.loading = true;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/utilisateurs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.utilisateurs = data.data;
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    })
    .catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  chargerStats() {
    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/utilisateurs/statistiques`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.stats.total = data.data.utilisateurs.total;
        this.stats.clients = data.data.utilisateurs.clients;
        this.stats.livreurs = data.data.utilisateurs.livreurs;
        this.stats.admins = data.data.utilisateurs.admins;
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  filtrer() {
    let result = [...this.utilisateurs];

    if (this.ongletActif === 'clients') result = result.filter(u => u.role === 'client');
    else if (this.ongletActif === 'livreurs') result = result.filter(u => u.role === 'livreur');
    else if (this.ongletActif === 'admins') result = result.filter(u => u.role === 'admin');
    else if (this.ongletActif === 'bloques') result = result.filter(u => !u.est_actif);

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        u.nom?.toLowerCase().includes(q) ||
        u.prenom?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.telephone?.includes(q)
      );
    }

    this.utilisateursFiltres = result;
    this.stats.bloques = this.utilisateurs.filter(u => !u.est_actif).length;
    this.page = 1;
    this.cdr.detectChanges();
  }

  changerOnglet(onglet: string) {
    this.ongletActif = onglet;
    this.filtrer();
  }

  get utilisateursPagines() {
    const debut = (this.page - 1) * this.parPage;
    return this.utilisateursFiltres.slice(debut, debut + this.parPage);
  }

  get totalPages() {
    return Math.ceil(this.utilisateursFiltres.length / this.parPage);
  }

  get pages() {
    return Array.from({ length: Math.min(this.totalPages, 5) }, (_, i) => i + 1);
  }

  changerPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.cdr.detectChanges();
    }
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL
  // ══════════════════════════════════
  private construireOptionsUtilisateurs(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const dt = (v: any) => this.exportService.date(v);

    const source = this.utilisateursFiltres.length > 0
      ? this.utilisateursFiltres
      : this.utilisateurs;

    const libelleOnglet: any = {
      'tous': 'Tous les utilisateurs',
      'clients': 'Clients uniquement',
      'livreurs': 'Livreurs uniquement',
      'admins': 'Administrateurs uniquement',
      'bloques': 'Comptes bloqués'
    };

    return {
      titre: 'Liste des utilisateurs',
      sousTitre: `${libelleOnglet[this.ongletActif] || 'Tous'} · ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `quickbite-utilisateurs-${dateFichier}`,
      orientation: 'landscape',
      donnees: source,
      colonnes: [
        { cle: 'id', titre: 'ID', largeur: 8 },
        { cle: 'prenom', titre: 'Prénom', largeur: 18 },
        { cle: 'nom', titre: 'Nom', largeur: 18 },
        { cle: 'email', titre: 'Email', largeur: 32 },
        { cle: 'telephone', titre: 'Téléphone', largeur: 18 },
        { cle: 'role', titre: 'Rôle', largeur: 14,
          format: (v: any) => this.getRoleLabelSimple(v) },
        { cle: 'est_actif', titre: 'Statut', largeur: 13,
          format: (v: any) => (v ? 'Actif' : 'Bloqué') },
        { cle: 'ville', titre: 'Ville', largeur: 16,
          format: (v: any) => v || '—' },
        { cle: 'created_at', titre: 'Inscrit le', largeur: 20, format: dt }
      ],
      resume: [
        { label: 'Total', valeur: String(source.length) },
        { label: 'Clients', valeur: String(source.filter(u => u.role === 'client').length) },
        { label: 'Livreurs', valeur: String(source.filter(u => u.role === 'livreur').length) },
        { label: 'Admins', valeur: String(source.filter(u => u.role === 'admin').length) },
        { label: 'Bloqués', valeur: String(source.filter(u => !u.est_actif).length) }
      ]
    };
  }

  exporterPDF() {
    if (this.utilisateurs.length === 0) {
      alert('Aucun utilisateur à exporter');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsUtilisateurs());
  }

  exporterExcel() {
    if (this.utilisateurs.length === 0) {
      alert('Aucun utilisateur à exporter');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsUtilisateurs());
  }

  exporterCSV() {
    if (this.utilisateurs.length === 0) {
      alert('Aucun utilisateur à exporter');
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsUtilisateurs());
  }

  // VOIR PROFIL
  voirProfil(user: any) {
    this.userSelectionne = user;
    this.showProfil = true;
    this.cdr.detectChanges();
  }

  fermerProfil() {
    this.showProfil = false;
    this.userSelectionne = null;
    this.cdr.detectChanges();
  }

  // BLOQUER / DÉBLOQUER
  toggleActif(user: any) {
    const action = user.est_actif ? 'Bloquer' : 'Débloquer';
    if (!confirm(`${action} ${user.prenom} ${user.nom} ?`)) return;

    const token = localStorage.getItem('token');
    fetch(`${this.apiUrl}/utilisateurs/${user.id}/toggle-actif`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        user.est_actif = data.est_actif;
        this.filtrer();
        this.cdr.detectChanges();
      }
    }).catch(() => {});
  }

  // CONFIRMER SUPPRESSION
  confirmerSuppression(user: any) {
    this.userASupprimer = user;
    this.showConfirmSuppr = true;
    this.cdr.detectChanges();
  }

  supprimerUser() {
    if (!this.userASupprimer) return;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/utilisateurs/${this.userASupprimer.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.utilisateurs = this.utilisateurs.filter(u => u.id !== this.userASupprimer.id);
        this.filtrer();
        this.chargerStats();
      }
      this.showConfirmSuppr = false;
      this.userASupprimer = null;
      this.cdr.detectChanges();
    })
    .catch(() => {
      this.showConfirmSuppr = false;
      this.cdr.detectChanges();
    });
  }

  annulerSuppression() {
    this.showConfirmSuppr = false;
    this.userASupprimer = null;
    this.cdr.detectChanges();
  }

  getInitiales(user: any): string {
    return ((user.prenom?.[0] || '') + (user.nom?.[0] || '')).toUpperCase();
  }

  getRoleClass(role: string, actif: boolean): string {
    if (!actif) return 'role-blocked';
    const map: any = {
      'client': 'role-client',
      'admin': 'role-admin',
      'livreur': 'role-livreur',
      'restaurant': 'role-resto'
    };
    return map[role] || 'role-client';
  }

  getRoleLabel(role: string, actif: boolean): string {
    if (!actif) return '🚫 Bloqué';
    const map: any = {
      'client': '🛒 Client',
      'admin': '⚙️ Admin',
      'livreur': '🛵 Livreur',
      'restaurant': '🍽️ Restaurant'
    };
    return map[role] || role;
  }

  /** Version sans emoji, pour les exports PDF/Excel */
  getRoleLabelSimple(role: string): string {
    const map: any = {
      'client': 'Client',
      'admin': 'Administrateur',
      'livreur': 'Livreur',
      'restaurant': 'Restaurant'
    };
    return map[role] || role;
  }

  getAvatarGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg,#22A86A,#144D35)',
      'linear-gradient(135deg,#F5A623,#FFD700)',
      'linear-gradient(135deg,#FFD700,#E08B10)',
      'linear-gradient(135deg,#2563EB,#1E3A5F)',
      'linear-gradient(135deg,#22A86A,#2563EB)',
    ];
    return gradients[index % gradients.length];
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