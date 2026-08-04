import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);

  const token = localStorage.getItem('token');
  const utilisateur = localStorage.getItem('utilisateur');

  // Connecté → on laisse passer
  if (token && utilisateur) {
    return true;
  }

  // Pas connecté → redirection vers login
  router.navigate(['/login'], {
    queryParams: { retour: state.url }
  });

  return false;
};