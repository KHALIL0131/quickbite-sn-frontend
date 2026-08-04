import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExportService, OptionsExport } from '../../services/export.service';

@Component({
  selector: 'app-avis-clients',
  imports: [CommonModule, FormsModule],
  templateUrl: './avis-clients.html',
  styleUrl: './avis-clients.scss'
})
export class AvisClients implements OnInit {

  admin: any = null;
  sidebarOpen = false;

  avis: any[] = [];
  avisFiltres: any[] = [];
  loading = true;

  searchQuery = '';
  filtreNote = 0;
  filtreSansReponse = false;

  noteMoyenne = 0;
  totalAvis = 0;
  repartition = [0, 0, 0, 0, 0];

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    this.verifierAuth();
    this.chargerAvis();
    this.chargerStats();
  }

  verifierAuth() {
    const user = localStorage.getItem('utilisateur');
    if (!user) { this.router.navigate(['/admin-login']); return; }
    this.admin = JSON.parse(user);
    if (this.admin.role !== 'admin') { this.router.navigate(['/admin-login']); }
  }

  chargerAvis() {
    this.loading = true;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/avis`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.avis = data.data.map((a: any) => ({
          ...a,
          client_nom: a.client_prenom + ' ' + a.client_nom,
          initiales: ((a.client_prenom?.[0] || '') + (a.client_nom?.[0] || '')).toUpperCase(),
          plat: (a.plat_emoji || '🍽️') + ' ' + (a.plat_nom || 'Commande #' + a.commande_numero),
          tags: a.note >= 4 ?
            ['✅ Livraison rapide', '✅ Bonne qualité'] :
            a.note <= 2 ? ['⚠️ À améliorer'] : ['👍 Satisfaisant'],
          reponse: a.reponse_admin ? {
            texte: a.reponse_admin,
            date: a.reponse_date ? new Date(a.reponse_date).toLocaleDateString('fr-FR') : 'Récemment'
          } : null,
          reponse_ouverte: false,
          texte_reponse: '',
          negatif: a.note <= 2,
          verifie: true
        }));
        this.filtrer();
      }
      this.loading = false;
      this.cdr.detectChanges();
    })
    .catch(() => { this.loading = false; this.cdr.detectChanges(); });
  }

  chargerStats() {
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/avis/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const s = data.data;
        this.totalAvis = s.total || 0;
        this.noteMoyenne = parseFloat(s.note_moyenne || 0);
        const total = this.totalAvis || 1;
        this.repartition = [
          Math.round((s.un || 0) / total * 100),
          Math.round((s.deux || 0) / total * 100),
          Math.round((s.trois || 0) / total * 100),
          Math.round((s.quatre || 0) / total * 100),
          Math.round((s.cinq || 0) / total * 100)
        ];
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  filtrer() {
    let result = [...this.avis];

    if (this.filtreNote > 0) {
      result = result.filter(a => a.note === this.filtreNote);
    }

    if (this.filtreSansReponse) {
      result = result.filter(a => !a.reponse);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(a =>
        a.client_nom?.toLowerCase().includes(q) ||
        a.commentaire?.toLowerCase().includes(q)
      );
    }

    this.avisFiltres = result;
    this.cdr.detectChanges();
  }

  setFiltreNote(note: number) {
    this.filtreNote = this.filtreNote === note ? 0 : note;
    this.filtrer();
  }

  toggleSansReponse() {
    this.filtreSansReponse = !this.filtreSansReponse;
    this.filtrer();
  }

  toggleReponse(avis: any) {
    avis.reponse_ouverte = !avis.reponse_ouverte;
    this.cdr.detectChanges();
  }

  publierReponse(avis: any) {
    if (!avis.texte_reponse?.trim()) return;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/avis/${avis.id}/repondre`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reponse_admin: avis.texte_reponse })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        avis.reponse = {
          texte: avis.texte_reponse,
          date: 'À l\'instant'
        };
        avis.reponse_ouverte = false;
        avis.texte_reponse = '';
        this.filtrer();
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  supprimerAvis(avis: any) {
    if (!confirm(`Supprimer l'avis de ${avis.client_nom} ?`)) return;
    const token = localStorage.getItem('token');

    fetch(`${this.apiUrl}/avis/${avis.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        this.avis = this.avis.filter(a => a.id !== avis.id);
        this.chargerStats();
        this.filtrer();
      }
      this.cdr.detectChanges();
    }).catch(() => {});
  }

  toutSupprimer() {
    if (!confirm(`Supprimer TOUS les ${this.avisFiltres.length} avis filtrés ?`)) return;
    const token = localStorage.getItem('token');
    const ids = this.avisFiltres.map(a => a.id);

    Promise.all(ids.map(id =>
      fetch(`${this.apiUrl}/avis/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    )).then(() => {
      this.chargerAvis();
      this.chargerStats();
    });
  }

  // ══════════════════════════════════
  // EXPORTS PDF / EXCEL / CSV
  // ══════════════════════════════════
  private construireOptionsAvis(): OptionsExport {
    const dateFichier = new Date().toISOString().split('T')[0];
    const dt = (v: any) => this.exportService.date(v);

    const source = this.avisFiltres.length > 0 ? this.avisFiltres : this.avis;

    const compter = (n: number) => source.filter(a => parseInt(a.note) === n).length;
    const sansReponse = source.filter(a => !a.reponse).length;

    return {
      titre: 'Avis clients',
      sousTitre: `Situation au ${new Date().toLocaleDateString('fr-FR')}`,
      nomFichier: `quickbite-avis-${dateFichier}`,
      orientation: 'landscape',
      donnees: source,
      colonnes: [
        { cle: 'client_nom', titre: 'Client', largeur: 24 },
        { cle: 'note', titre: 'Note', largeur: 12,
          format: (v: any) => `${v || 0} / 5` },
        { cle: 'plat_nom', titre: 'Plat', largeur: 26,
          format: (v: any) => v || '—' },
        { cle: 'commentaire', titre: 'Commentaire', largeur: 46,
          format: (v: any) => v || '—' },
        { cle: 'reponse', titre: 'Réponse admin', largeur: 40,
          format: (v: any) => v?.texte || 'Sans réponse' },
        { cle: 'created_at', titre: 'Date', largeur: 20, format: dt }
      ],
      resume: [
        { label: 'Total avis', valeur: String(source.length) },
        { label: 'Note moyenne', valeur: `${this.noteMoyenne.toFixed(1)} / 5` },
        { label: '5 étoiles', valeur: String(compter(5)) },
        { label: '4 étoiles', valeur: String(compter(4)) },
        { label: 'Négatifs (1-2)', valeur: String(compter(1) + compter(2)) },
        { label: 'Sans réponse', valeur: String(sansReponse) }
      ]
    };
  }

  exporter() {
    this.exporterPDF();
  }

  exporterPDF() {
    if (this.avis.length === 0) {
      alert('Aucun avis à exporter');
      return;
    }
    this.exportService.exporterPDF(this.construireOptionsAvis());
  }

  exporterExcel() {
    if (this.avis.length === 0) {
      alert('Aucun avis à exporter');
      return;
    }
    this.exportService.exporterExcel(this.construireOptionsAvis());
  }

  exporterCSV() {
    if (this.avis.length === 0) {
      alert('Aucun avis à exporter');
      return;
    }
    this.exportService.exporterCSV(this.construireOptionsAvis());
  }

  getEtoiles(note: number): string {
    return '⭐'.repeat(note) + '☆'.repeat(5 - note);
  }

  getAvatarGradient(i: number): string {
    const grads = [
      'linear-gradient(135deg,#22A86A,#144D35)',
      'linear-gradient(135deg,#F5A623,#E08B10)',
      'linear-gradient(135deg,#2563EB,#1E3A5F)',
      'linear-gradient(135deg,#FFD700,#F5A623)',
      'linear-gradient(135deg,#22A86A,#2563EB)',
    ];
    return grads[i % grads.length];
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