import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Ajoute automatiquement le token JWT à chaque requête sortante.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const token = localStorage.getItem('token');

  // Pas de token → on laisse passer tel quel
  if (!token) {
    return next(req);
  }

  // Token présent → on clone la requête en ajoutant l'en-tête
  const requeteAvecToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(requeteAvecToken);
};