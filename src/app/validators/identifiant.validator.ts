import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valide un identifiant : email OU numéro de téléphone sénégalais.
 * Formats acceptés : nom@domaine.com · 77 123 45 67 · +221771234567
 */
export function identifiantValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    const valeur = (control.value || '').toString().trim();
    if (!valeur) return null; // required s'en charge

    const estEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valeur);

    // Téléphone sénégalais : 7 chiffres après 70/75/76/77/78, avec ou sans +221
    const nettoye = valeur.replace(/[\s.-]/g, '');
    const estTelephone = /^(\+221|221)?(7[05678])[0-9]{7}$/.test(nettoye);

    if (estEmail || estTelephone) return null;

    return { identifiantInvalide: true };
  };
}

/**
 * Force du mot de passe.
 * Renvoie le détail des critères manquants pour un affichage précis.
 */
export function motDePasseFortValidator(minLongueur: number = 6): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    const valeur = (control.value || '').toString();
    if (!valeur) return null;

    const erreurs: any = {};

    if (valeur.length < minLongueur) {
      erreurs.tropCourt = { requis: minLongueur, actuel: valeur.length };
    }
    if (!/[0-9]/.test(valeur)) {
      erreurs.sansChiffre = true;
    }

    return Object.keys(erreurs).length > 0 ? { motDePasseFaible: erreurs } : null;
  };
}

/**
 * Vérifie que deux champs sont identiques (utile pour register).
 * S'applique sur le FormGroup, pas sur un champ.
 */
export function champsIdentiquesValidator(champA: string, champB: string): ValidatorFn {
  return (groupe: AbstractControl): ValidationErrors | null => {

    const a = groupe.get(champA);
    const b = groupe.get(champB);

    if (!a || !b || !b.value) return null;

    return a.value === b.value ? null : { champsDifferents: true };
  };
}