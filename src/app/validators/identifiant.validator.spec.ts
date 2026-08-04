import { describe, it, expect } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import {
  identifiantValidator,
  motDePasseFortValidator,
  champsIdentiquesValidator
} from './identifiant.validator';

describe('identifiantValidator', () => {

  const valider = (valeur: any) => {
    const control = new FormControl(valeur);
    return identifiantValidator()(control);
  };

  it('accepte un email valide', () => {
    expect(valider('khalil@quickbite.sn')).toBeNull();
    expect(valider('ibrahima.faye42@unchk.edu.sn')).toBeNull();
  });

  it('accepte un numero senegalais', () => {
    expect(valider('771234567')).toBeNull();
    expect(valider('77 123 45 67')).toBeNull();
    expect(valider('+221771234567')).toBeNull();
    expect(valider('781234567')).toBeNull();
  });

  it('refuse un email mal forme', () => {
    expect(valider('abc')).toEqual({ identifiantInvalide: true });
    expect(valider('abc@')).toEqual({ identifiantInvalide: true });
    expect(valider('@domaine.com')).toEqual({ identifiantInvalide: true });
  });

  it('refuse un numero non senegalais', () => {
    expect(valider('123456789')).toEqual({ identifiantInvalide: true });
    expect(valider('7712345')).toEqual({ identifiantInvalide: true });
  });

  it('laisse passer une valeur vide (required s en charge)', () => {
    expect(valider('')).toBeNull();
    expect(valider(null)).toBeNull();
  });
});

describe('motDePasseFortValidator', () => {

  const valider = (valeur: any, min = 6) => {
    const control = new FormControl(valeur);
    return motDePasseFortValidator(min)(control);
  };

  it('accepte un mot de passe valide', () => {
    expect(valider('quickbite2026')).toBeNull();
    expect(valider('abc123')).toBeNull();
  });

  it('refuse un mot de passe trop court', () => {
    const erreur: any = valider('ab1');
    expect(erreur).not.toBeNull();
    expect(erreur.motDePasseFaible.tropCourt).toEqual({ requis: 6, actuel: 3 });
  });

  it('refuse un mot de passe sans chiffre', () => {
    const erreur: any = valider('quickbite');
    expect(erreur.motDePasseFaible.sansChiffre).toBe(true);
  });

  it('signale les deux problemes a la fois', () => {
    const erreur: any = valider('abc');
    expect(erreur.motDePasseFaible.tropCourt).toBeDefined();
    expect(erreur.motDePasseFaible.sansChiffre).toBe(true);
  });

  it('respecte une longueur minimale personnalisee', () => {
    expect(valider('abc12345', 8)).toBeNull();
    const erreur: any = valider('abc123', 8);
    expect(erreur.motDePasseFaible.tropCourt.requis).toBe(8);
  });
});

describe('champsIdentiquesValidator', () => {

  const groupe = (a: string, b: string) => {
    const g = new FormGroup({
      mot_de_passe: new FormControl(a),
      confirmation: new FormControl(b)
    });
    return champsIdentiquesValidator('mot_de_passe', 'confirmation')(g);
  };

  it('accepte deux champs identiques', () => {
    expect(groupe('quickbite2026', 'quickbite2026')).toBeNull();
  });

  it('refuse deux champs differents', () => {
    expect(groupe('quickbite2026', 'autre2026')).toEqual({ champsDifferents: true });
  });

  it('ignore la verification si le second champ est vide', () => {
    expect(groupe('quickbite2026', '')).toBeNull();
  });
});