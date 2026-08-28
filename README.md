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
- [Nitro](https://nitro.build) pour le build serveur (préset `node-server`, serveur Node autonome)

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

Le build cible le préset Nitro `node-server` (configuré dans `vite.config.ts`), qui produit un serveur Node autonome dans `.output/server/index.mjs` (avec son propre `node_modules`, pas besoin de réinstaller de dépendances sur le serveur cible).

```sh
# Copier le contenu de .output/ sur le serveur, puis :
node .output/server/index.mjs
```

Par défaut, le serveur écoute sur le port défini par la variable d'environnement `PORT` (3000 si non définie). Un reverse proxy (Nginx, Caddy, IIS…) peut ensuite exposer l'application en HTTPS sur un nom de domaine.

> D'autres présets Nitro sont disponibles (Cloudflare Workers, Vercel, Netlify, Deno Deploy, etc.) — voir la [documentation Nitro](https://nitro.build/deploy) pour la liste complète.

### Déployer sur un serveur Windows avec PM2

**1. Prérequis** (une fois)

```powershell
# Node.js LTS depuis nodejs.org
# Bun
powershell -c "irm bun.sh/install.ps1 | iex"
npm install -g pm2
```

**2. Récupérer et builder**

```powershell
git clone <url-du-depot> C:\apps\code-generator
cd C:\apps\code-generator
bun install
bun run build
```

**3. Lancer avec PM2**

Le fichier `ecosystem.config.js` à la racine du projet configure l'app PM2 `code-generator` (port 3000) :

```powershell
pm2 start ecosystem.config.js
pm2 save
```

**4. Démarrage automatique au boot** (une fois)

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

**Commandes usuelles**

```powershell
pm2 status
pm2 logs code-generator
pm2 restart code-generator   # après un nouveau bun run build
```

Mettre un reverse proxy (IIS + ARR, ou nginx pour Windows) devant pour le HTTPS/domaine.
