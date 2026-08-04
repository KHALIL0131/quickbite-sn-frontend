import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard paramétrable par rôle.
 * Exemple d'usage dans les routes :
 *   canActivate: [authGuard, roleGuard(['admin'])]
 *   canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
 */
export const roleGuard = (rolesAutorises: string[]): CanActivateFn => {

  return (route, state) => {

    const router = inject(Router);

    const userStr = localStorage.getItem('utilisateur');

    // Aucun utilisateur en mémoire
    if (!userStr) {
      router.navigate(['/login']);
      return false;
    }

    let utilisateur: any = null;
    try {
      utilisateur = JSON.parse(userStr);
    } catch (e) {
      localStorage.removeItem('utilisateur');
      localStorage.removeItem('token');
      router.navigate(['/login']);
      return false;
    }

    const role = utilisateur?.role;

    // Rôle autorisé → on laisse passer
    if (role && rolesAutorises.includes(role)) {
      return true;
    }

    // Rôle refusé → chacun vers son espace
    if (role === 'admin') {
      router.navigate(['/dashboard-admin']);
    } else if (role === 'livreur') {
      router.navigate(['/dashboard-livreur']);
    } else {
      router.navigate(['/accueil']);
    }

    return false;
  };
};