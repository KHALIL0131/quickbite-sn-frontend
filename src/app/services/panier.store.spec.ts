import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PanierStore } from './panier.store';

describe('PanierStore', () => {

  let store: PanierStore;

  const burger = {
    id: 1, nom: 'Double Smash Burger', prix: 4500,
    emoji: '🍔', restaurant_id: 1, restaurant_nom: 'Le Burger du Plateau'
  };

  const jus = {
    id: 2, nom: 'Jus de Bissap', prix: 1000,
    emoji: '🥤', restaurant_id: 1, restaurant_nom: 'Le Burger du Plateau'
  };

  const thieb = {
    id: 3, nom: 'Thiéboudiène', prix: 3500,
    emoji: '🍛', restaurant_id: 2, restaurant_nom: 'Chez Maman Fatou'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [PanierStore] });
    store = TestBed.inject(PanierStore);
    store.vider();
  });

  it('demarre avec un panier vide', () => {
    expect(store.estVide()).toBe(true);
    expect(store.nombreArticles()).toBe(0);
    expect(store.sousTotal()).toBe(0);
  });

  it('ajoute un article', () => {
    store.ajouter(burger);
    expect(store.articles().length).toBe(1);
    expect(store.nombreArticles()).toBe(1);
    expect(store.sousTotal()).toBe(4500);
    expect(store.estVide()).toBe(false);
  });

  it('ajoute plusieurs unites du meme plat', () => {
    store.ajouter(burger, 3);
    expect(store.articles().length).toBe(1);
    expect(store.nombreArticles()).toBe(3);
    expect(store.sousTotal()).toBe(13500);
  });

  it('cumule les quantites si le plat est deja present', () => {
    store.ajouter(burger);
    store.ajouter(burger);
    expect(store.articles().length).toBe(1);
    expect(store.quantiteDe(1)).toBe(2);
  });

  it('calcule le sous-total sur plusieurs articles', () => {
    store.ajouter(burger, 2);
    store.ajouter(jus, 3);
    expect(store.sousTotal()).toBe(2 * 4500 + 3 * 1000);
    expect(store.nombreArticles()).toBe(5);
  });

  it('incremente une quantite', () => {
    store.ajouter(burger);
    store.incrementer(1);
    expect(store.quantiteDe(1)).toBe(2);
  });

  it('decremente une quantite', () => {
    store.ajouter(burger, 3);
    store.decrementer(1);
    expect(store.quantiteDe(1)).toBe(2);
  });

  it('retire l article quand la quantite tombe a zero', () => {
    store.ajouter(burger);
    store.decrementer(1);
    expect(store.estVide()).toBe(true);
  });

  it('retire un article', () => {
    store.ajouter(burger);
    store.ajouter(jus);
    store.retirer(1);
    expect(store.articles().length).toBe(1);
    expect(store.contient(1)).toBe(false);
    expect(store.contient(2)).toBe(true);
  });

  it('definit une quantite precise', () => {
    store.ajouter(burger);
    store.definirQuantite(1, 7);
    expect(store.quantiteDe(1)).toBe(7);
  });

  it('retire l article si la quantite definie est nulle', () => {
    store.ajouter(burger);
    store.definirQuantite(1, 0);
    expect(store.estVide()).toBe(true);
  });

  it('vide entierement le panier', () => {
    store.ajouter(burger, 2);
    store.ajouter(jus);
    store.vider();
    expect(store.estVide()).toBe(true);
    expect(store.sousTotal()).toBe(0);
  });

  it('regroupe les articles par restaurant', () => {
    store.ajouter(burger);
    store.ajouter(jus);
    store.ajouter(thieb);

    const groupes = store.restaurants();
    expect(groupes.length).toBe(2);
    expect(store.nombreRestaurants()).toBe(2);

    const plateau = groupes.find(g => g.nom === 'Le Burger du Plateau');
    expect(plateau?.items.length).toBe(2);
  });

  it('sauvegarde dans localStorage apres synchronisation', async () => {
    store.ajouter(burger, 2);

    // L'effect() Angular s'execute au cycle suivant
    TestBed.tick();

    const brut = localStorage.getItem('panier');
    expect(brut).not.toBeNull();

    const parse = JSON.parse(brut!);
    expect(parse[0].id).toBe(1);
    expect(parse[0].quantite).toBe(2);
    expect(parse[0].nom).toBe('Double Smash Burger');
  });

  it('convertit un prix texte en nombre', () => {
    store.ajouter({ ...burger, prix: '4500.00' as any });
    expect(store.sousTotal()).toBe(4500);
  });

  it('quantiteDe renvoie zero pour un plat absent', () => {
    expect(store.quantiteDe(999)).toBe(0);
    expect(store.contient(999)).toBe(false);
  });
});