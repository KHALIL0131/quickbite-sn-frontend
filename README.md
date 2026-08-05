# QuickBite SN

**Plateforme de livraison de repas à Dakar**

Application web full-stack développée dans le cadre du module Angular avancé — Master 1 Développement Full Stack Web et Mobile, Université Numérique Cheikh Hamidou Kane (UNCHK), Promotion 8.

---

## Équipe

| Nom | INE | Email |
|---|---|---|
| Ibrahima Faye | N01252820201 | ibrahima.faye42@unchk.edu.sn |
| Mansour Ba | N00432120201 | mansour.ba@unchk.edu.sn |
| Seydou Tall | N00285320201 | seydou.tall1@unchk.edu.sn |
| Diouma Baldé | N05739420202 | diouma.balde1@unchk.edu.sn |

**Catégorie du sujet :** Commerce — Application de livraison de repas

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Architecture technique](#2-architecture-technique)
3. [Installation](#3-installation)
4. [Structure du projet](#4-structure-du-projet)
5. [Base de données](#5-base-de-données)
6. [API REST](#6-api-rest)
7. [Sécurité](#7-sécurité)
8. [Temps réel](#8-temps-réel)
9. [Tests](#9-tests)
10. [Choix techniques](#10-choix-techniques)
11. [Comptes de démonstration](#11-comptes-de-démonstration)

---

## 1. Présentation

QuickBite SN met en relation trois types d'utilisateurs autour de la livraison de repas dans l'agglomération dakaroise.

### Le parcours complet

Un **client** parcourt le menu, remplit son panier, choisit sa zone de livraison — dont le tarif est affiché avant paiement — et valide sa commande.

L'**administrateur** voit arriver la commande sur son tableau de bord. Il choisit un livreur dans la liste des livreurs actifs et lui assigne la course.

Le **livreur** reçoit instantanément une alerte sonore et visuelle sur son dashboard, avec le nom du client, son téléphone, l'adresse de livraison, le montant de la commande et son gain. Il accepte la course, suit son itinéraire sur une carte GPS, et peut discuter avec le client via une messagerie temps réel.

Une fois la livraison marquée comme effectuée, le gain du livreur est enregistré et remonte automatiquement sur ses statistiques, son historique et la fiche que l'administrateur consulte.

### Les trois espaces

**Espace client** — accueil, catalogue, recherche multicritère, détail des plats avec options et suppléments, panier avec calcul du tarif de livraison par zone, codes promotionnels, suivi de commande, historique, profil, messagerie.

**Espace livreur** — dashboard avec KPI du jour, mes livraisons, historique, gains, carte GPS temps réel, gestion du véhicule (moto, carburant, entretien), profil, messagerie.

**Espace administrateur** — dashboard analytique, gestion des commandes en kanban avec assignation des livreurs, gestion du menu, utilisateurs, livreurs, finances, zones de livraison et grille tarifaire, statistiques, avis clients, rapports exportables, notifications, paramètres.

---

## 2. Architecture technique

### Vue d'ensemble

```
┌──────────────────────────────┐
│   Angular 21 (port 4200)     │
│   Standalone · Lazy loading  │
└──────────┬───────────────────┘
           │ HTTP (JWT) + WebSocket
┌──────────▼───────────────────┐
│   Node.js / Express (3000)   │
│   REST + Socket.io           │
└──────────┬───────────────────┘
           │ mysql2/promise
┌──────────▼───────────────────┐
│   MySQL — quickbite_db       │
└──────────────────────────────┘
```

### Front-end

| Élément | Choix |
|---|---|
| Framework | Angular 21, composants standalone |
| Routage | Lazy loading via `loadComponent` sur les 40 routes |
| État | Signal Store maison (`PanierStore`, `AuthStore`) |
| HTTP | `HttpClient` + interceptors fonctionnels |
| Formulaires | Reactive Forms avec validateurs personnalisés |
| Graphiques | Chart.js |
| Cartographie | Leaflet + OpenStreetMap |
| Temps réel | socket.io-client |
| Export | jsPDF, jspdf-autotable, SheetJS |
| Tests | Vitest |
| Styles | SCSS, design system maison |

### Back-end

| Élément | Choix |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Base | MySQL via `mysql2/promise` |
| Authentification | JWT (`jsonwebtoken`), mots de passe hachés `bcryptjs` |
| Upload | Multer |
| Email | Nodemailer (codes OTP) |
| Temps réel | Socket.io |

---

## 3. Installation

### Prérequis

Node.js 18 ou supérieur, MySQL 8, Angular CLI 21, Git.

### Base de données

```bash
mysql -u root -p
CREATE DATABASE quickbite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
exit
mysql -u root -p quickbite_db < quickbite_db.sql
```

### Back-end

```bash
cd quickbite-backend
npm install
```

Créer un fichier `.env` :

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=quickbite_db
JWT_SECRET=votre_cle_secrete
JWT_EXPIRES_IN=24h
GMAIL_USER=votre.email@gmail.com
GMAIL_PASS=mot_de_passe_application_gmail
```

Le `GMAIL_PASS` est un mot de passe d'application Google, pas le mot de passe du compte. Il se génère depuis les paramètres de sécurité du compte Google, section « Mots de passe des applications ».

```bash
node server.js
```

Sortie attendue :

```
QuickBite Backend démarré sur http://localhost:3000
MySQL connecté avec succès
Email service prêt
```

### Front-end

```bash
cd quickbite-app
npm install
ng serve
```

L'application est accessible sur `http://localhost:4200`.

### Configuration réseau

Les URL sont centralisées dans `src/environments/environment.ts` :

```typescript
export const environment = {
  production: false,
  serverUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000'
};
```

Pour tester depuis un téléphone sur le même réseau Wi-Fi, remplacer `localhost` par l'adresse IP de la machine, puis lancer `ng serve --host 0.0.0.0`.

---

## 4. Structure du projet

```
quickbite-app/
├── src/
│   ├── app/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts           Vérifie la connexion
│   │   │   ├── auth.guard.spec.ts      13 tests
│   │   │   └── role.guard.ts           Guard paramétrable par rôle
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts     Injecte le JWT
│   │   │   └── erreur.interceptor.ts   Traitement centralisé des erreurs
│   │   ├── services/
│   │   │   ├── api.service.ts          Couche HTTP centralisée
│   │   │   ├── auth.store.ts           Signal Store utilisateur
│   │   │   ├── panier.store.ts         Signal Store panier
│   │   │   ├── panier.store.spec.ts    16 tests
│   │   │   ├── export.service.ts       PDF, Excel, CSV
│   │   │   └── export.service.spec.ts  11 tests
│   │   ├── validators/
│   │   │   ├── identifiant.validator.ts
│   │   │   └── identifiant.validator.spec.ts  13 tests
│   │   ├── pages/                      40 composants standalone
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── environments/
│   └── test-setup.ts
└── angular.json

quickbite-backend/
├── config/
│   ├── database.js
│   └── email.js
├── controllers/
│   ├── auth.controller.js
│   ├── commande.controller.js
│   ├── livreur.controller.js
│   ├── zone.controller.js
│   ├── plat.controller.js
│   ├── restaurant.controller.js
│   ├── utilisateur.controller.js
│   └── avis.controller.js
├── routes/
├── middleware/
│   └── auth.middleware.js
├── uploads/
└── server.js
```

---

## 5. Base de données

### Tables principales

| Table | Rôle |
|---|---|
| `utilisateurs` | Comptes — le champ `role` distingue client, livreur, admin |
| `restaurants` | Établissements partenaires |
| `categories` | Catégories de plats |
| `plats` | Catalogue |
| `commandes` | Commandes, avec `livreur_id` et `zone_id` |
| `commande_details` | Lignes de commande |
| `zones_livraison` | Zones et grille tarifaire |
| `messages` | Messagerie client ↔ livreur |
| `notifications` | Notifications par utilisateur |
| `avis` | Avis clients |
| `adresses` | Carnet d'adresses |
| `otp_codes` | Codes de vérification email |
| `vehicules` | Véhicules des livreurs |
| `carburants` | Suivi carburant |
| `entretiens` | Suivi entretien |
| `gains_livreurs` | Historique des gains |
| `positions_livreurs` | Position GPS temps réel |

### La table `zones_livraison`

C'est elle qui porte le modèle tarifaire.

```sql
CREATE TABLE zones_livraison (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  nom                    VARCHAR(150) NOT NULL,
  description            TEXT,
  frais_livraison        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_commande           DECIMAL(10,2) DEFAULT 0.00,
  livraison_gratuite_des DECIMAL(10,2) DEFAULT 0.00,
  delai_min              INT DEFAULT 20,
  delai_max              INT DEFAULT 35,
  rayon_km               DECIMAL(5,2) DEFAULT 0.00,
  couleur                VARCHAR(20) DEFAULT '#22A86A',
  quartiers              TEXT,
  statut                 ENUM('active','limitee','inactive') DEFAULT 'active',
  pos_top                DECIMAL(5,2) DEFAULT 50.00,
  pos_left               DECIMAL(5,2) DEFAULT 50.00,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                         ON UPDATE CURRENT_TIMESTAMP
);
```

Le champ `quartiers` contient une liste séparée par des virgules. Lorsqu'un client saisit son adresse, l'application cherche une correspondance dans ces listes pour présélectionner sa zone.

### Zones initiales

| Zone | Prix | Minimum | Gratuite dès | Délai |
|---|---|---|---|---|
| Plateau | 1 000 F | 2 000 F | 15 000 F | 15–25 min |
| Médina | 1 500 F | 2 000 F | 20 000 F | 20–30 min |
| HLM / Grand Dakar | 2 000 F | 3 000 F | 25 000 F | 25–40 min |
| Parcelles Assainies | 2 500 F | 3 000 F | 30 000 F | 30–45 min |

---

## 6. API REST

Toutes les routes sont préfixées par `/api`.

### Authentification

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion, renvoie le JWT |
| PUT | `/auth/profil` | Mise à jour du profil |
| PUT | `/auth/changer-mot-de-passe` | Changement de mot de passe |
| POST | `/otp/envoyer` | Envoi d'un code de vérification |
| POST | `/otp/verifier` | Vérification du code |

### Commandes

| Méthode | Route | Description |
|---|---|---|
| POST | `/commandes` | Création |
| GET | `/commandes` | Liste complète (admin) |
| GET | `/commandes/mes-commandes` | Commandes du client connecté |
| GET | `/commandes/:id` | Détail |
| PUT | `/commandes/:id/assigner` | Assignation d'un livreur |
| PUT | `/commandes/:id/statut` | Changement de statut |
| DELETE | `/commandes/:id` | Suppression |

### Zones de livraison

| Méthode | Route | Accès |
|---|---|---|
| GET | `/zones/actives` | Public — utilisé par le panier |
| POST | `/zones/calculer-frais` | Public — calcul selon l'adresse |
| GET | `/zones` | Admin |
| POST | `/zones` | Admin |
| PUT | `/zones/:id` | Admin |
| PUT | `/zones/:id/statut` | Admin |
| DELETE | `/zones/:id` | Admin |

### Espace livreur

| Méthode | Route |
|---|---|
| GET | `/livreur/mes-livraisons` |
| GET | `/livreur/historique` |
| GET | `/livreur/gains` |
| GET | `/livreur/statistiques` |
| GET/POST | `/livreur/vehicule` |
| GET/POST | `/livreur/carburant` |
| GET/POST | `/livreur/entretien` |
| POST | `/livreur/position` |
| GET | `/livreur/positions/tous` |

### Messagerie et notifications

| Méthode | Route |
|---|---|
| GET | `/messages/conversations/:user_id` |
| GET | `/messages/:commande_id` |
| GET | `/notifications/:user_id` |
| PUT | `/notifications/:user_id/lues` |

**Point d'attention :** dans `server.js`, la route `/messages/conversations/:user_id` est déclarée avant `/messages/:commande_id`. L'ordre est nécessaire — Express résout les routes séquentiellement, et `:commande_id` capturerait sinon le segment `conversations`.

---

## 7. Sécurité

### Authentification JWT

À la connexion, le serveur signe un jeton contenant l'identifiant, l'email et le rôle de l'utilisateur, valable 24 heures. Le client le stocke et le transmet à chaque requête.

### Interceptor d'authentification

L'en-tête `Authorization` n'est jamais écrit à la main dans les composants. L'interceptor l'ajoute automatiquement :

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (!token) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
```

Une requête Angular étant immuable, on en fabrique une copie enrichie plutôt que de modifier l'original.

### Interceptor d'erreurs

Il traduit les codes HTTP en messages français et gère l'expiration de session. Une subtilité : sur les routes d'authentification, un 401 signifie « identifiants incorrects » et non « session expirée » — il ne faut donc pas déconnecter l'utilisateur ni le rediriger.

```typescript
if (erreur.status === 401) {
  const estRouteAuth = req.url.includes('/auth/login')
    || req.url.includes('/auth/register')
    || req.url.includes('/otp');

  if (estRouteAuth) {
    message = erreur.error?.message || 'Identifiants incorrects';
  } else {
    message = 'Session expirée. Veuillez vous reconnecter.';
    localStorage.removeItem('token');
    localStorage.removeItem('utilisateur');
    router.navigate(['/login']);
  }
}
```

### Guards

Deux guards protègent les 40 routes.

`authGuard` vérifie la présence d'un jeton et mémorise l'URL demandée pour y revenir après connexion.

`roleGuard` est une fonction qui **fabrique** un guard à partir d'une liste de rôles :

```typescript
canActivate: [authGuard, roleGuard(['admin'])]
canActivate: [authGuard, roleGuard(['livreur', 'admin'])]
```

Lorsque l'accès est refusé, l'utilisateur n'est pas renvoyé sur une page d'erreur mais vers l'espace qui lui correspond — un livreur qui tente d'ouvrir `/dashboard-admin` atterrit sur son propre dashboard.

L'intérêt d'un guard par rapport à une vérification dans `ngOnInit` est décisif : le guard s'exécute **avant** le chargement du composant. Avec une vérification dans le cycle de vie, la page s'affiche brièvement avant la redirection.

### Autres mesures

Mots de passe hachés avec bcrypt. CORS restreint à l'origine du front. Vérification du rôle également côté serveur, dans `auth.middleware.js` — le contrôle côté client seul ne protège de rien.

---

## 8. Temps réel

Socket.io gère deux fonctionnalités.

### Assignation d'une course

Quand l'administrateur assigne un livreur, le serveur émet un événement vers la salle privée de ce livreur :

```javascript
socket.on('assigner_commande', (data) => {
  const { livreur_id, commande } = data;
  io.to(`user_${livreur_id}`).emit('commande_assignee', {
    ...commande,
    gain_livreur: Math.round(commande.frais_livraison || 0)
  });
});
```

Côté livreur, l'alerte apparaît immédiatement, accompagnée d'un signal sonore généré via l'API Web Audio — sans fichier son à charger.

### Messagerie

Chaque utilisateur rejoint une salle nommée `user_{id}` à la connexion. Les messages sont persistés en base puis diffusés aux deux interlocuteurs.

Les fonctions couvertes : envoi, modification, suppression, accusé de lecture, indicateur de saisie en cours.

La conversation n'existe qu'entre le client et le livreur assigné à sa commande. La requête SQL des conversations filtre sur `c.livreur_id IS NOT NULL` — tant qu'aucun livreur n'est assigné, aucune conversation n'apparaît.

### Suivi GPS

La position du livreur est relevée par l'API de géolocalisation du navigateur et transmise au serveur toutes les dix secondes. La carte s'appuie sur Leaflet et OpenStreetMap, sans clé d'API ni coût.

---

## 9. Tests

### Exécution

```bash
cd quickbite-app
ng test
```

### Couverture

| Fichier | Tests | Objet |
|---|---|---|
| `identifiant.validator.spec.ts` | 13 | Validateurs personnalisés |
| `panier.store.spec.ts` | 16 | Signal Store du panier |
| `export.service.spec.ts` | 11 | Service d'export |
| `auth.guard.spec.ts` | 13 | Guards de sécurité |
| **Total** | **53** | |

### Ce qui est vérifié

Les validateurs acceptent un email ou un numéro sénégalais aux formats `771234567`, `77 123 45 67`, `+221771234567`, et rejettent le reste.

Le Signal Store du panier est testé sur l'ajout, le cumul de quantités, la suppression automatique à quantité nulle, le calcul du sous-total, le regroupement par restaurant et la persistance.

Les guards sont vérifiés sur tous les cas : visiteur non connecté, mémorisation de l'URL de retour, client tentant d'accéder à l'espace admin, redirection vers l'espace correspondant au rôle, et données corrompues dans le stockage local.

### Une difficulté rencontrée

Le test de persistance du panier échouait initialement. La cause : un `effect()` Angular ne s'exécute pas de façon synchrone — il est planifié pour le cycle suivant. Le test lisait le stockage local avant que l'effet n'ait écrit.

```typescript
it('sauvegarde dans localStorage apres synchronisation', () => {
  store.ajouter(burger, 2);
  TestBed.tick();          // force le cycle de détection
  const brut = localStorage.getItem('panier');
  expect(brut).not.toBeNull();
});
```

Ce n'était pas un défaut du code applicatif mais une méconnaissance du modèle d'exécution des signaux — exactement le genre de chose qu'un test révèle.

---

## 10. Choix techniques

### Signal Store plutôt que NgRx

Le panier était initialement lu depuis le stockage local dans chaque composant, avec cinq copies du même code de désérialisation. Deux problèmes : la duplication, et l'absence de réactivité entre pages.

Le Signal Store apporte une source unique, des valeurs dérivées recalculées automatiquement, et une persistance transparente :

```typescript
private _articles = signal<ArticlePanier[]>(this.lireDepuisStockage());
readonly articles = this._articles.asReadonly();

readonly nombreArticles = computed(() =>
  this._articles().reduce((total, a) => total + a.quantite, 0)
);

constructor() {
  effect(() => {
    localStorage.setItem(this.CLE, JSON.stringify(this._articles()));
  });
}
```

NgRx aurait apporté actions, reducers, effects et selectors — une infrastructure disproportionnée pour un panier et une session utilisateur. Les Signals d'Angular couvrent le besoin avec une fraction du code.

### Tarification par zone plutôt qu'au pourcentage

Le gain du livreur était calculé à 15 % du montant de la commande. Ce modèle pose un problème d'équité : deux livraisons à la même adresse, l'une de 5 000 F et l'autre de 50 000 F, rémunèrent 750 F et 7 500 F pour un travail identique.

Le modèle retenu est celui des plateformes établies — Yango, Glovo, Jumia Food : un tarif fixe par zone géographique. Le client connaît son prix avant de payer, le livreur sait exactement ce qu'il gagne, et l'entreprise maîtrise sa grille.

Le champ `frais_livraison` de la commande porte cette valeur, qui devient le gain du livreur.

### Zone non répertoriée

Dakar s'étend au-delà des zones configurées. Le panier propose donc une option « Ma zone n'est pas dans la liste » : le client saisit son quartier, la commande part avec `zone_id` à `NULL` et une note visible par l'administrateur, qui appelle le client pour convenir du tarif avant d'assigner un livreur.

### OpenStreetMap plutôt que Google Maps

Google Maps facture au-delà d'un quota et exige une carte bancaire. OpenStreetMap et Leaflet sont libres et gratuits, sans clé d'API. Pour un projet étudiant destiné à tourner en démonstration, c'est le choix pragmatique.

### jsPDF et SheetJS

Les exports produisaient auparavant des fichiers texte renommés en `.pdf` et `.xlsx`. Ils génèrent désormais de vrais documents : le PDF comporte un en-tête, des cartes de synthèse, un tableau à lignes alternées et une pagination ; l'Excel comporte deux feuilles, données et synthèse.

Une limite à connaître : la police par défaut de jsPDF ne rend pas les emojis. Les libellés exportés sont donc en texte simple — « Livré » plutôt que « ✅ Livré » — alors que l'interface conserve les icônes.

### Interceptors plutôt que fetch

L'application utilisait `fetch()` dans chaque composant, avec la lecture du jeton et la construction des en-têtes répétées à l'identique. Le passage à `HttpClient` avec interceptors centralise cette logique : les composants ne connaissent plus l'authentification.

---

## 11. Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@quickbite.sn | password |
| Client | À créer via l'inscription | — |
| Livreur | Créé par l'admin depuis la page Livreurs | — |

Un code secret est requis pour accéder à l'espace d'administration : `QUICKBITE_ADMIN_2026`.

### Codes promotionnels de test

| Code | Réduction |
|---|---|
| BIENVENUE20 | 20 % |
| QUICKBITE10 | 10 % |
| DAKAR15 | 15 % |
| KHALIL25 | 25 % |

### Scénario de démonstration

1. S'inscrire comme client et vérifier l'email via le code OTP reçu
2. Ajouter des plats au panier depuis le menu
3. Choisir une zone de livraison et constater le calcul du tarif
4. Valider la commande
5. Se connecter en administrateur, ouvrir la commande, assigner un livreur
6. Se connecter en livreur dans une autre fenêtre : l'alerte apparaît en temps réel
7. Accepter la course, ouvrir la messagerie, échanger avec le client
8. Marquer la livraison comme effectuée
9. Vérifier que le gain apparaît de façon identique sur les gains, l'historique, et la fiche livreur côté administrateur

---

## Licence

Projet académique — UNCHK, Master 1 Développement Full Stack Web et Mobile, Promotion 8.
