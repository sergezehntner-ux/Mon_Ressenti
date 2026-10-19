# Mon Ressenti — Compagnon SZ

**v0.1.0 — fondations** · « Toute la richesse, sans la complication »

Application PWA autonome de suivi des ressentis et capacités quotidiennes. Aucun compte, aucune transmission de données, aucune bibliothèque externe.

## Installer via GitHub Pages

1. Déposer les fichiers de cette archive **à la racine** de la branche `main` du dépôt `Mon_Ressenti` (conserver `README.md`).
2. Dans **Settings → Pages**, sélectionner **Deploy from a branch**, `main`, `/ (root)`, puis enregistrer.
3. Ouvrir `https://sergezehntner-ux.github.io/Mon_Ressenti/` après publication. Dans le navigateur, utiliser « Ajouter à l'écran d'accueil » / « Installer ».

## Contenu de cette version

- Saisie d'observations (0–10, description, caractéristiques, facteurs, notes).
- Bilans quotidiens (capacité 0–10, activités, notes).
- Journal filtrable, édition et suppression individuelle.
- Statistiques descriptives simples.
- Stockage local **IndexedDB**, sauvegarde/restauration JSON versionnée, export CSV.
- Fonctionnement hors connexion après première visite sur HTTPS.

## Confidentialité

Les données sont enregistrées dans le navigateur **sur l'appareil utilisé** : elles ne sont pas incluses dans GitHub. Faire régulièrement une sauvegarde JSON, en particulier avant une mise à jour ou un changement de téléphone. Ne pas utiliser la navigation privée. Le stockage local peut être effacé par le navigateur ou le système.

## Import MMP

**Pas encore disponible en v0.1.0.** Le PDF du 06.08.2026 reste un jeu de test privé et n'est pas inclus dans le dépôt. Un import PDF vérifiable (avec contrôle des scores graphiques et des doublons) est prévu pour v0.2.0. Ne pas désinstaller MMP.

## Limites

Il ne s'agit pas d'un dispositif médical. Les analyses décrivent des déclarations personnelles, sans diagnostic ni causalité. Aucun rappel ou synchronisation entre appareils dans cette version.


## v0.2.8 — Rapport imprimable
Dans Analyses, « Préparer le rapport PDF » ouvre une synthèse locale de deux pages A4 paysage. Le navigateur permet de choisir Imprimer > Enregistrer au format PDF. Les champs d’identité facultatifs sont conservés uniquement dans le stockage local du navigateur. Les calculs portent sur les observations présentes, sans données simulées.


## Relance GitHub Pages — 19 octobre 2026
Déclenchement d’une nouvelle publication après suppression du workflow #68 bloqué. Aucun changement du code applicatif ni des données locales.
