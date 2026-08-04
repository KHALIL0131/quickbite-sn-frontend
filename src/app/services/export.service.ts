import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ColonneExport {
  cle: string;
  titre: string;
  largeur?: number;
  format?: (valeur: any, ligne?: any) => string;
}

export interface OptionsExport {
  titre: string;
  sousTitre?: string;
  nomFichier: string;
  colonnes: ColonneExport[];
  donnees: any[];
  resume?: { label: string; valeur: string }[];
  orientation?: 'portrait' | 'landscape';
}

@Injectable({ providedIn: 'root' })
export class ExportService {

  private readonly VERT = [34, 168, 106] as [number, number, number];
  private readonly ORANGE = [245, 166, 35] as [number, number, number];
  private readonly SOMBRE = [13, 43, 30] as [number, number, number];

  // ══════════════════════════════════
  // EXPORT PDF
  // ══════════════════════════════════
  exporterPDF(options: OptionsExport): void {

    const doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const largeurPage = doc.internal.pageSize.getWidth();

    // ── EN-TÊTE ──
    doc.setFillColor(...this.SOMBRE);
    doc.rect(0, 0, largeurPage, 32, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('QuickBite SN', 14, 15);

    doc.setTextColor(...this.ORANGE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Livraison de repas · Dakar, Sénégal', 14, 22);

    doc.setTextColor(180, 200, 190);
    doc.setFontSize(8);
    const genere = `Généré le ${new Date().toLocaleString('fr-FR')}`;
    doc.text(genere, largeurPage - 14, 15, { align: 'right' });

    // ── TITRE DU RAPPORT ──
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(options.titre, 14, 45);

    let y = 52;

    if (options.sousTitre) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 110, 110);
      doc.text(options.sousTitre, 14, y);
      y += 8;
    }

    // ── RÉSUMÉ EN CARTES ──
    if (options.resume && options.resume.length > 0) {
      const largeurCarte = (largeurPage - 28 - (options.resume.length - 1) * 4)
                           / options.resume.length;
      let x = 14;

      options.resume.forEach(item => {
        doc.setFillColor(245, 248, 246);
        doc.roundedRect(x, y, largeurCarte, 18, 2, 2, 'F');

        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(item.label.toUpperCase(), x + 3, y + 6);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...this.VERT);
        doc.text(item.valeur, x + 3, y + 13);
        doc.setFont('helvetica', 'normal');

        x += largeurCarte + 4;
      });

      y += 26;
    }

    // ── TABLEAU ──
    const entetes = options.colonnes.map(c => c.titre);
    const lignes = options.donnees.map(d =>
      options.colonnes.map(c => {
        const valeur = this.lireChemin(d, c.cle);
        return c.format ? c.format(valeur, d) : (valeur ?? '—');
      })
    );

    autoTable(doc, {
      head: [entetes],
      body: lignes,
      startY: y,
      theme: 'striped',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: this.VERT,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      alternateRowStyles: { fillColor: [248, 250, 249] },
      margin: { left: 14, right: 14 }
    });

    // ── PIED DE PAGE ──
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      const hauteur = doc.internal.pageSize.getHeight();

      doc.setDrawColor(220, 225, 222);
      doc.line(14, hauteur - 14, largeurPage - 14, hauteur - 14);

      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text('QuickBite SN · Document confidentiel', 14, hauteur - 9);
      doc.text(`Page ${i} / ${total}`, largeurPage - 14, hauteur - 9, { align: 'right' });
    }

    doc.save(`${options.nomFichier}.pdf`);
  }

  // ══════════════════════════════════
  // EXPORT EXCEL
  // ══════════════════════════════════
  exporterExcel(options: OptionsExport): void {

    const lignes = options.donnees.map(d => {
      const ligne: any = {};
      options.colonnes.forEach(c => {
        const valeur = this.lireChemin(d, c.cle);
        ligne[c.titre] = c.format ? c.format(valeur, d) : (valeur ?? '');
      });
      return ligne;
    });

    const feuille = XLSX.utils.json_to_sheet(lignes);

    // Largeurs de colonnes
    feuille['!cols'] = options.colonnes.map(c => ({
      wch: c.largeur || Math.max(c.titre.length + 4, 14)
    }));

    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, 'Données');

    // Feuille de synthèse
    if (options.resume && options.resume.length > 0) {
      const synthese = [
        { Information: 'Rapport', Valeur: options.titre },
        { Information: 'Période', Valeur: options.sousTitre || '—' },
        { Information: 'Généré le', Valeur: new Date().toLocaleString('fr-FR') },
        { Information: 'Nombre de lignes', Valeur: String(options.donnees.length) },
        { Information: '', Valeur: '' },
        ...options.resume.map(r => ({ Information: r.label, Valeur: r.valeur }))
      ];

      const feuilleSynthese = XLSX.utils.json_to_sheet(synthese);
      feuilleSynthese['!cols'] = [{ wch: 28 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(classeur, feuilleSynthese, 'Synthèse');
    }

    XLSX.writeFile(classeur, `${options.nomFichier}.xlsx`);
  }

  // ══════════════════════════════════
  // EXPORT CSV
  // ══════════════════════════════════
  exporterCSV(options: OptionsExport): void {

    const entetes = options.colonnes.map(c => `"${c.titre}"`).join(',');

    const lignes = options.donnees.map(d =>
      options.colonnes.map(c => {
        const valeur = this.lireChemin(d, c.cle);
        const texte = c.format ? c.format(valeur, d) : (valeur ?? '');
        return `"${String(texte).replace(/"/g, '""')}"`;
      }).join(',')
    );

    // BOM UTF-8 pour qu'Excel affiche les accents correctement
    const contenu = '\ufeff' + [entetes, ...lignes].join('\n');

    const blob = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
    this.telechargerBlob(blob, `${options.nomFichier}.csv`);
  }

  // ══════════════════════════════════
  // UTILITAIRES
  // ══════════════════════════════════

  /** Lit une propriété, même imbriquée : 'utilisateurs.clients' */
  private lireChemin(objet: any, chemin: string): any {
    return chemin.split('.').reduce((o, cle) => o?.[cle], objet);
  }

  private telechargerBlob(blob: Blob, nom: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Formateur monétaire réutilisable dans les colonnes */
  montant(valeur: any): string {
    const v = parseFloat(valeur);
    return new Intl.NumberFormat('fr-FR').format(isNaN(v) ? 0 : Math.round(v)) + ' F';
  }

  /** Formateur de date réutilisable */
  date(valeur: any): string {
    if (!valeur) return '—';
    return new Date(valeur).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}