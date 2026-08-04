import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ExportService } from './export.service';

describe('ExportService', () => {

  let service: ExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ExportService] });
    service = TestBed.inject(ExportService);
  });

  describe('formatage des montants', () => {

    it('formate un nombre en francs CFA', () => {
      expect(service.montant(2500)).toContain('2');
      expect(service.montant(2500)).toContain('500');
      expect(service.montant(2500)).toContain('F');
    });

    it('formate une chaine numerique', () => {
      expect(service.montant('17000.00')).toContain('17');
      expect(service.montant('17000.00')).toContain('000');
    });

    it('renvoie zero pour une valeur invalide', () => {
      expect(service.montant(null)).toBe('0 F');
      expect(service.montant(undefined)).toBe('0 F');
      expect(service.montant('abc')).toBe('0 F');
    });

    it('arrondit les decimales', () => {
      expect(service.montant(1499.6)).toContain('500');
    });
  });

  describe('formatage des dates', () => {

    it('formate une date ISO', () => {
      const resultat = service.date('2026-08-04T14:30:00');
      expect(resultat).toContain('04');
      expect(resultat).toContain('08');
      expect(resultat).toContain('2026');
    });

    it('renvoie un tiret pour une date absente', () => {
      expect(service.date(null)).toBe('—');
      expect(service.date('')).toBe('—');
      expect(service.date(undefined)).toBe('—');
    });
  });

  describe('generation CSV', () => {

    const commandes = [
      { numero: 'QB-001', client: 'Ibou Diouf', montant: 17000, statut: 'livree' },
      { numero: 'QB-002', client: 'Khalil Faye', montant: 8500, statut: 'nouvelle' }
    ];

    const options: any = {
      titre: 'Test commandes',
      sousTitre: 'Periode de test',
      nomFichier: 'test-export',
      donnees: commandes,
      colonnes: [
        { cle: 'numero', titre: 'Numero' },
        { cle: 'client', titre: 'Client' },
        { cle: 'montant', titre: 'Montant', format: (v: any) => service.montant(v) },
        { cle: 'statut', titre: 'Statut' }
      ],
      resume: [
        { label: 'Total', valeur: '2' }
      ]
    };

    it('produit un CSV sans lever d erreur', () => {
      expect(() => service.exporterCSV(options)).not.toThrow();
    });

    it('gere une liste vide', () => {
      expect(() => service.exporterCSV({ ...options, donnees: [] })).not.toThrow();
    });

    it('gere l absence de resume', () => {
      const sansResume = { ...options };
      delete sansResume.resume;
      expect(() => service.exporterCSV(sansResume)).not.toThrow();
    });
  });

  describe('lecture des proprietes imbriquees', () => {

    it('lit une propriete simple via une colonne', () => {
      const donnees = [{ nom: 'Thieboudiene', prix: 3500 }];
      const options: any = {
        titre: 'Plats',
        nomFichier: 'plats',
        donnees,
        colonnes: [
          { cle: 'nom', titre: 'Plat' },
          { cle: 'prix', titre: 'Prix', format: (v: any) => service.montant(v) }
        ]
      };
      expect(() => service.exporterCSV(options)).not.toThrow();
    });

    it('gere une propriete manquante sans planter', () => {
      const donnees = [{ nom: 'Burger' }];
      const options: any = {
        titre: 'Plats',
        nomFichier: 'plats',
        donnees,
        colonnes: [
          { cle: 'nom', titre: 'Plat' },
          { cle: 'categorie.libelle', titre: 'Categorie' }
        ]
      };
      expect(() => service.exporterCSV(options)).not.toThrow();
    });
  });
});