import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Intercepte les erreurs HTTP et les traite de façon centralisée.
 */
export const erreurInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);

  return next(req).pipe(
    catchError((erreur: HttpErrorResponse) => {

      let message = 'Une erreur est survenue';

      if (erreur.status === 0) {
        message = 'Serveur injoignable. Vérifiez votre connexion.';
      }
     else if (erreur.status === 401) {
        // Sur les routes d'authentification, 401 = mauvais identifiants
        const estRouteAuth =
          req.url.includes('/auth/login') ||
          req.url.includes('/auth/register') ||
          req.url.includes('/otp') ||
          req.url.includes('/reset');

        if (estRouteAuth) {
          message = erreur.error?.message || 'Identifiants incorrects';
        } else {
          message = 'Session expirée. Veuillez vous reconnecter.';
          localStorage.removeItem('token');
          localStorage.removeItem('utilisateur');
          router.navigate(['/login']);
        }
      }
      else if (erreur.status === 403) {
        message = 'Accès refusé.';
      }
      else if (erreur.status === 404) {
        message = 'Ressource introuvable.';
      }
      else if (erreur.status >= 500) {
        message = 'Erreur serveur. Réessayez plus tard.';
      }
      else if (erreur.error?.message) {
        message = erreur.error.message;
      }

      console.error(`[HTTP ${erreur.status}] ${message}`, erreur.url);

      return throwError(() => ({
        status: erreur.status,
        message,
        original: erreur
      }));
    })
  );
};