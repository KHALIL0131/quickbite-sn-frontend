import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [

  // ══════════════════════════════════════
  // SPLASH
  // ══════════════════════════════════════
  { path: '', loadComponent: () => import('./pages/splash-screen/splash-screen').then(m => m.SplashScreen) },

  // ══════════════════════════════════════
  // AUTH — public
  // ══════════════════════════════════════
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.Register) },
  { path: 'otp', loadComponent: () => import('./pages/otp/otp').then(m => m.Otp) },
  { path: 'mot-de-passe-oublie', loadComponent: () => import('./pages/mot-de-passe-oublie/mot-de-passe-oublie').then(m => m.MotDePasseOublie) },
  { path: 'admin-login', loadComponent: () => import('./pages/admin-login/admin-login').then(m => m.AdminLogin) },

  // ══════════════════════════════════════
  // VITRINE — public, sans compte
  // ══════════════════════════════════════
  { path: 'accueil', loadComponent: () => import('./pages/accueil/accueil').then(m => m.Accueil) },
  { path: 'menu', loadComponent: () => import('./pages/menu/menu').then(m => m.Menu) },
  { path: 'a-propos', loadComponent: () => import('./pages/a-propos/a-propos').then(m => m.APropos) },
  { path: 'recherche', loadComponent: () => import('./pages/recherche/recherche').then(m => m.Recherche) },
  { path: 'detail-plat', loadComponent: () => import('./pages/detail-plat/detail-plat').then(m => m.DetailPlat) },
  { path: 'panier', loadComponent: () => import('./pages/panier/panier').then(m => m.Panier) },

  // ══════════════════════════════════════
  // CLIENT — connexion obligatoire
  // ══════════════════════════════════════
  {
    path: 'suivi-commande',
    loadComponent: () => import('./pages/suivi-commande/suivi-commande').then(m => m.SuiviCommande),
    canActivate: [authGuard]
  },
  {
    path: 'confirmation-commande',
    loadComponent: () => import('./pages/confirmation-commande/confirmation-commande').then(m => m.ConfirmationCommande),
    canActivate: [authGuard]
  },
  {
    path: 'historique-commandes',
    loadComponent: () => import('./pages/historique-commandes/historique-commandes').then(m => m.HistoriqueCommandes),
    canActivate: [authGuard]
  },
  {
    path: 'profil-client',
    loadComponent: () => import('./pages/profil-client/profil-client').then(m => m.ProfilClient),
    canActivate: [authGuard]
  },
  {
    path: 'messagerie',
    loadComponent: () => import('./pages/messagerie/messagerie').then(m => m.Messagerie),
    canActivate: [authGuard]
  },

  // ══════════════════════════════════════
  // ADMIN — rôle admin exigé
  // ══════════════════════════════════════
  {
    path: 'dashboard-admin',
    loadComponent: () => import('./pages/dashboard-admin/dashboard-admin').then(m => m.DashboardAdmin),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'gestion-commandes',
    loadComponent: () => import('./pages/gestion-commandes/gestion-commandes').then(m => m.GestionCommandes),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'gestion-menu',
    loadComponent: () => import('./pages/gestion-menu/gestion-menu').then(m => m.GestionMenu),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'utilisateurs',
    loadComponent: () => import('./pages/utilisateurs/utilisateurs').then(m => m.Utilisateurs),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'livreurs',
    loadComponent: () => import('./pages/livreurs/livreurs').then(m => m.Livreurs),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'finances',
    loadComponent: () => import('./pages/finances/finances').then(m => m.Finances),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'zones-livraison',
    loadComponent: () => import('./pages/zones-livraison/zones-livraison').then(m => m.ZonesLivraison),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'statistiques',
    loadComponent: () => import('./pages/statistiques/statistiques').then(m => m.Statistiques),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'avis-clients',
    loadComponent: () => import('./pages/avis-clients/avis-clients').then(m => m.AvisClients),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'rapports',
    loadComponent: () => import('./pages/rapports/rapports').then(m => m.Rapports),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'parametres',
    loadComponent: () => import('./pages/parametres/parametres').then(m => m.Parametres),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'journal-audit',
    loadComponent: () => import('./pages/journal-audit/journal-audit').then(m => m.JournalAudit),
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  {
    path: 'securite-jwt',
    loadComponent: () => import('./pages/securite-jwt/securite-jwt').then(m => m.SecuriteJwt),
    canActivate: [authGuard, roleGuard(['admin'])]
  },

  // ══════════════════════════════════════
  // LIVREUR — rôle livreur ou admin
  // ══════════════════════════════════════
  {
    path: 'dashboard-livreur',
    loadComponent: () => import('./pages/dashboard-livreur/dashboard-livreur').then(m => m.DashboardLivreur),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'mes-livraisons',
    loadComponent: () => import('./pages/mes-livraisons/mes-livraisons').then(m => m.MesLivraisons),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'historique-livreur',
    loadComponent: () => import('./pages/historique-livreur/historique-livreur').then(m => m.HistoriqueLivreur),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'gains-livreur',
    loadComponent: () => import('./pages/gains-livreur/gains-livreur').then(m => m.GainsLivreur),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'carte-livreur',
    loadComponent: () => import('./pages/carte-livreur/carte-livreur').then(m => m.CarteLivreur),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'mon-moto',
    loadComponent: () => import('./pages/mon-moto/mon-moto').then(m => m.MonMoto),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'carburant',
    loadComponent: () => import('./pages/carburant/carburant').then(m => m.Carburant),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'entretien',
    loadComponent: () => import('./pages/entretien/entretien').then(m => m.Entretien),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'profil-livreur',
    loadComponent: () => import('./pages/profil-livreur/profil-livreur').then(m => m.ProfilLivreur),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },
  {
    path: 'messagerie-livreur',
    loadComponent: () => import('./pages/messagerie-livreur/messagerie-livreur').then(m => m.MessagerielivreurComponent),
    canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
  },

  // ══════════════════════════════════════
  // 404
  // ══════════════════════════════════════
  { path: 'page-not-found', loadComponent: () => import('./pages/page-not-found/page-not-found').then(m => m.PageNotFound) },
  { path: '**', loadComponent: () => import('./pages/page-not-found/page-not-found').then(m => m.PageNotFound) }
];