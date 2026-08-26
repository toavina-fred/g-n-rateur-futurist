# Générateur Futurist

Bonjour,
Crée un site web vitrine one-page au design futuriste, épuré et harmonieux, servant d'outil de génération de codes-barres (Code 128) et de QR Codes.

Stack technique

React (Vite) + TypeScript

Tailwind CSS pour le style

shadcn/ui pour les composants de formulaire (Select, Input, Slider, ColorPicker, RadioGroup)

Utiliser une librairie de génération côté client :

JsBarcode pour le Code 128

qrcode (ou qrcode.react) pour le QR Code

jsPDF (+ html2canvas si besoin) pour l'export PDF de l'aperçu généré

Direction artistique

Thème sombre par défaut (fond dégradé bleu nuit / violet profond), avec effet glassmorphism (cartes translucides, bordures fines lumineuses, léger flou d'arrière-plan)

Accents néon (cyan / violet électrique) sur les boutons, focus des champs et bordures actives

Typographie moderne et lisible (ex. Space Grotesk ou Inter) pour l'UI générale

Animations douces : transitions au survol, apparition en fondu des champs conditionnels, légère lueur (glow) sur le bouton d'export

Layout en deux colonnes sur desktop : formulaire à gauche, prévisualisation en temps réel à droite (sticky), qui se replient en une seule colonne empilée sur mobile

Interface entièrement en français

Formulaire — champs et logique métier

1. Type de code-barres

Champ Select nommé "Type de code-barres"

Deux valeurs uniquement : Code 128 / QR Code

C'est ce choix qui détermine l'affichage et les règles des autres champs (voir ci-dessous)

2. Contenu

Champ texte "Contenu"

Si Code 128 sélectionné :

Saisie strictement limitée à 9 caractères, ni plus ni moins

Validation en temps réel : bloquer la saisie au-delà de 9 caractères, afficher un message d'erreur si moins de 9 caractères au moment de générer

Compteur de caractères visible (ex. "6/9")

Si QR Code sélectionné :

Le champ doit contenir uniquement une URL valide (regex de validation d'URL, ex. commence par http:// ou https://)

Message d'erreur clair si le format n'est pas une URL valide

3. Largeur du module

Champ numérique avec réglage (input number ou slider + input)

Valeur par défaut : 0,347 mm si Code 128, 0,952 mm si QR Code

Se met à jour automatiquement à la valeur par défaut lors du changement de type (mais reste modifiable par l'utilisateur)

4. Largeur code-barres

Champ numérique avec réglage

Valeur par défaut : 35,000 mm si Code 128, 20,000 mm si QR Code

5. Hauteur du module

Champ numérique avec réglage

Valeur par défaut : 4,000 mm

Visible uniquement si Code 128 est sélectionné (champ masqué si QR Code)

6. Couleur des barres

Sélecteur de couleur (color picker)

Valeur par défaut : noir (#000000)

Modifiable librement par l'utilisateur

7. Couleur du fond

Sélecteur de couleur (color picker)

Valeur par défaut : blanc (#FFFFFF)

Modifiable librement par l'utilisateur

8. Afficher la ligne de texte (radio / switch)

Bouton radio ou switch "Afficher la ligne de texte"

Si activé : afficher le contenu du champ 2 sous le code-barres généré

Visible uniquement si Code 128 est sélectionné (masqué si QR Code, car non pertinent)

9. Police

Champ Select listant plusieurs polices (ex. Helvetica Neue, Arial, Courier New, Verdana, Roboto…)

Valeur par défaut : Helvetica Neue

Visible uniquement si Code 128 est sélectionné

10. Taille de police

Champ numérique avec réglage

Valeur par défaut : 7,00 pt

Visible uniquement si Code 128 est sélectionné

11. Prévisualisation

Zone de prévisualisation en temps réel, dans une carte glassmorphism bien mise en valeur

Si Code 128 : afficher l'image du code-barres généré dynamiquement selon tous les réglages (largeur module, largeur totale, hauteur module, couleurs, police, taille police, ligne de texte)

Si QR Code : afficher l'image du QR Code généré dynamiquement selon le contenu, la largeur du module, la largeur totale et les couleurs

Mise à jour instantanée à chaque modification d'un champ (pas besoin de bouton "générer")

Afficher un état vide élégant tant que le contenu n'est pas valide (placeholder avec icône)

12. Export PDF

Bouton "Exporter en PDF" avec effet néon au survol

Génère un PDF contenant l'image du code-barres/QR code généré (aux dimensions définies), téléchargeable directement

Désactivé (grisé) tant que le contenu n'est pas valide

Comportement général attendu

Validation en temps réel avec messages d'erreur clairs et discrets (rouge doux, pas agressif)

Changement fluide (fade/slide) entre les champs affichés/masqués lors du switch Code 128 ↔ QR Code

Design responsive, optimisé desktop et mobile

Aucune donnée n'a besoin d'être sauvegardée en base : tout se passe côté client

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3ca55307-4479-4444-b851-13be33ec593c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
