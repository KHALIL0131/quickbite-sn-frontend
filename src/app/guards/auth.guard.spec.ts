import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';

describe('Guards de securite', () => {

  let routerMock: any;

  const executer = (guard: any, url = '/test') => {
    return TestBed.runInInjectionContext(() =>
      guard({} as any, { url } as any)
    );
  };

  beforeEach(() => {
    localStorage.clear();
    routerMock = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: routerMock }]
    });
  });

  describe('authGuard', () => {

    it('bloque un visiteur non connecte', () => {
      const resultat = executer(authGuard, '/dashboard-admin');
      expect(resultat).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalled();
    });

    it('memorise l url demandee pour y revenir apres connexion', () => {
      executer(authGuard, '/mes-livraisons');
      const appel = routerMock.navigate.mock.calls[0];
      expect(appel[0]).toEqual(['/login']);
      expect(appel[1].queryParams.retour).toBe('/mes-livraisons');
    });

    it('laisse passer un utilisateur connecte', () => {
      localStorage.setItem('token', 'jwt-de-test');
      localStorage.setItem('utilisateur', JSON.stringify({ id: 1, role: 'client' }));

      const resultat = executer(authGuard);
      expect(resultat).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('bloque si le token manque', () => {
      localStorage.setItem('utilisateur', JSON.stringify({ id: 1, role: 'client' }));
      expect(executer(authGuard)).toBe(false);
    });

    it('bloque si l utilisateur manque', () => {
      localStorage.setItem('token', 'jwt-de-test');
      expect(executer(authGuard)).toBe(false);
    });
  });

  describe('roleGuard', () => {

    const connecter = (role: string) => {
      localStorage.setItem('token', 'jwt-de-test');
      localStorage.setItem('utilisateur', JSON.stringify({ id: 1, role }));
    };

    it('laisse passer un admin sur une route admin', () => {
      connecter('admin');
      expect(executer(roleGuard(['admin']))).toBe(true);
    });

    it('bloque un client sur une route admin', () => {
      connecter('client');
      expect(executer(roleGuard(['admin']))).toBe(false);
    });

    it('renvoie le client vers l accueil', () => {
      connecter('client');
      executer(roleGuard(['admin']));
      expect(routerMock.navigate).toHaveBeenCalledWith(['/accueil']);
    });

    it('renvoie le livreur vers son dashboard', () => {
      connecter('livreur');
      executer(roleGuard(['admin']));
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard-livreur']);
    });

    it('renvoie l admin vers son dashboard', () => {
      connecter('admin');
      executer(roleGuard(['livreur']));
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard-admin']);
    });

    it('accepte plusieurs roles autorises', () => {
      connecter('livreur');
      expect(executer(roleGuard(['livreur', 'admin']))).toBe(true);

      localStorage.clear();
      connecter('admin');
      expect(executer(roleGuard(['livreur', 'admin']))).toBe(true);
    });

    it('bloque si aucun utilisateur en memoire', () => {
      expect(executer(roleGuard(['admin']))).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('nettoie et bloque si les donnees sont corrompues', () => {
      localStorage.setItem('utilisateur', 'ceci-nest-pas-du-json');
      expect(executer(roleGuard(['admin']))).toBe(false);
      expect(localStorage.getItem('utilisateur')).toBeNull();
    });
  });
});