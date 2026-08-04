import { Injectable, signal, computed, effect } from '@angular/core';

export interface ArticlePanier {
  id: number;
  nom: string;
  prix: number;
  quantite: number;
  emoji?: string;
  photo?: string;
  restaurant_id?: number;
  restaurant_nom?: string;
  note?: string;
  supplements?: string[];
}

@Injectable({ providedIn: 'root' })
export class PanierStore {

  private readonly CLE = 'panier';

  // ══ ÉTAT — signal privé, modifiable seulement ici ══
  private _articles = signal<ArticlePanier[]>(this.lireDepuisStockage());

  // ══ LECTURE SEULE — exposé aux composants ══
  readonly articles = this._articles.asReadonly();

  // ══ VALEURS DÉRIVÉES — recalculées automatiquement ══
  readonly nombreArticles = computed(() =>
    this._articles().reduce((total, a) => total + a.quantite, 0)
  );

  readonly sousTotal = computed(() =>
    this._articles().reduce((total, a) => total + (a.prix * a.quantite), 0)
  );

  readonly estVide = computed(() => this._articles().length === 0);

  readonly restaurants = computed(() => {
    const groupes = new Map<string, ArticlePanier[]>();
    this._articles().forEach(a => {
      const cle = a.restaurant_nom || 'Restaurant';
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle)!.push(a);
    });
    return Array.from(groupes, ([nom, items]) => ({ nom, items }));
  });

  readonly nombreRestaurants = computed(() => this.restaurants().length);

  constructor() {
    // Sauvegarde automatique à chaque changement
    effect(() => {
      const articles = this._articles();
      try {
        localStorage.setItem(this.CLE, JSON.stringify(articles));
      } catch (e) {
        console.error('Panier non sauvegardé', e);
      }
    });
  }

  // ══ ACTIONS ══

  ajouter(plat: any, quantite: number = 1) {
    this._articles.update(articles => {
      const existant = articles.find(a => a.id === plat.id);

      if (existant) {
        return articles.map(a =>
          a.id === plat.id ? { ...a, quantite: a.quantite + quantite } : a
        );
      }

      return [...articles, {
        id: plat.id,
        nom: plat.nom,
        prix: parseFloat(plat.prix) || 0,
        quantite,
        emoji: plat.emoji,
        photo: plat.photo,
        restaurant_id: plat.restaurant_id,
        restaurant_nom: plat.restaurant_nom,
        note: plat.note || '',
        supplements: plat.supplements || []
      }];
    });
  }

  retirer(id: number) {
    this._articles.update(articles => articles.filter(a => a.id !== id));
  }

  incrementer(id: number) {
    this._articles.update(articles =>
      articles.map(a => a.id === id ? { ...a, quantite: a.quantite + 1 } : a)
    );
  }

  decrementer(id: number) {
    const article = this._articles().find(a => a.id === id);
    if (article && article.quantite <= 1) {
      this.retirer(id);
      return;
    }
    this._articles.update(articles =>
      articles.map(a => a.id === id ? { ...a, quantite: a.quantite - 1 } : a)
    );
  }

  definirQuantite(id: number, quantite: number) {
    if (quantite <= 0) { this.retirer(id); return; }
    this._articles.update(articles =>
      articles.map(a => a.id === id ? { ...a, quantite } : a)
    );
  }

  vider() {
    this._articles.set([]);
  }

  contient(id: number): boolean {
    return this._articles().some(a => a.id === id);
  }

  quantiteDe(id: number): number {
    return this._articles().find(a => a.id === id)?.quantite || 0;
  }

  // ══ PERSISTANCE ══
  private lireDepuisStockage(): ArticlePanier[] {
    try {
      const brut = localStorage.getItem(this.CLE);
      if (!brut) return [];
      const parse = JSON.parse(brut);
      return Array.isArray(parse) ? parse : [];
    } catch (e) {
      return [];
    }
  }
}