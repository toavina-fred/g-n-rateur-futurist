# CodeGenerator — Générateur de Code 128 & QR Codes

Application web (one-page, thème sombre/glassmorphism) permettant de générer des codes-barres **Code 128** et des **QR Codes**, de les prévisualiser en temps réel avec des réglages précis (dimensions en mm, couleurs, police), et de les exporter en **PDF vectoriel**. Tout se passe côté client : aucune donnée n'est envoyée à un serveur.

Une page dédiée permet aussi la **génération en masse** à partir d'un import Excel (colonne « Contenu »), avec export groupé au format ZIP.

## Stack technique

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [TanStack Start](https://tanstack.com/start) (routing + SSR) sur [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) pour les composants
- [JsBarcode](https://github.com/lindell/JsBarcode) (Code 128) et [qrcode](https://github.com/soldair/node-qrcode) (QR Code)
- [jsPDF](https://github.com/parallax/jsPDF) pour l'export PDF vectoriel
- [xlsx](https://github.com/SheetJS/sheetjs) + [JSZip](https://stuk.github.io/jszip/) pour l'import Excel et l'export ZIP
- [Nitro](https://nitro.build) pour le build serveur (déploiement par défaut sur Cloudflare Workers)

## Prérequis

- [Bun](https://bun.sh) (gestionnaire de paquets du projet, cf. `bun.lock`) — ou Node.js 20+ avec npm en repli.

## Lancer le projet en local

```sh
# 1. Cloner le dépôt
git clone <url-du-depot>
cd generateur-futurist

# 2. Installer les dépendances
bun install
# (ou : npm install)

# 3. Lancer le serveur de développement
bun run dev
# (ou : npm run dev)
```

Le terminal affiche l'URL locale (généralement `http://localhost:5173`, potentiellement un autre port selon l'environnement). Le rechargement à chaud est activé : les modifications de code sont reflétées immédiatement dans le navigateur.

### Autres commandes utiles

| Commande            | Description                                              |
| ------------------- | --------------------------------------------------------- |
| `bun run build`      | Build de production (sortie dans `.output/`)               |
| `bun run lint`       | Vérifie le code avec ESLint                                 |
| `bun run format`     | Formate le code avec Prettier                               |

(Remplacer `bun run` par `npm run` selon le gestionnaire choisi.)

## Déployer sur un serveur

Le build de production est généré par Nitro dans le dossier `.output/` :

```sh
bun run build
```

### Option 1 — Cloudflare Workers (déploiement par défaut)

Le projet est préconfiguré pour Cloudflare Workers (`preset: cloudflare-module`). Après le build :

```sh
npx wrangler deploy
# ou, équivalent :
npx nitro deploy --prebuilt
```

Cela nécessite un compte Cloudflare et d'être authentifié via `npx wrangler login` au préalable.

Pour prévisualiser ce build localement avant de déployer (le classique `vite preview` ne fonctionne pas ici car la sortie est un worker SSR, pas un site statique) :

```sh
npx wrangler dev
```

### Option 2 — Serveur Node.js classique (VPS, conteneur, etc.)

Pour déployer sur un serveur Node.js standard plutôt que sur Cloudflare, forcez le préset Nitro `node-server` au moment du build :

```sh
NITRO_PRESET=node-server bun run build
```

Puis, sur le serveur cible :

```sh
# Copier le contenu de .output/ sur le serveur, installer les dépendances de production si besoin, puis :
node .output/server/index.mjs
```

Par défaut, le serveur écoute sur le port défini par la variable d'environnement `PORT` (3000 si non définie). Un reverse proxy (Nginx, Caddy…) peut ensuite exposer l'application en HTTPS sur un nom de domaine.

> D'autres présets Nitro sont disponibles (Vercel, Netlify, Deno Deploy, etc.) — voir la [documentation Nitro](https://nitro.build/deploy) pour la liste complète et la variable `NITRO_PRESET` correspondante.
