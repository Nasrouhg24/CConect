@AGENTS.md

# Avant d'explorer le dépôt

Lire **`docs/MAP.md`** d'abord, et se laisser aiguiller par lui. C'est une
carte : elle va d'une intention (« changer un libellé », « ajouter une
colonne ») aux fichiers concernés, en une page. Les cartes de détail vivent
dans `docs/map/` — n'en ouvrir qu'une, et seulement si l'aiguillage ne suffit
pas.

Le dépôt fait ~20 000 lignes de TypeScript. Balayer `src/` au `grep` pour
situer un écran coûte plus cher que tout le travail qui suit, et la carte
existe précisément pour éviter ça. Elle dit *où regarder* ; ce que fait
vraiment un fichier est écrit en tête de ce fichier, dans un commentaire à
jour. Les deux se contredisent ? Le code a raison, la carte est à corriger.

Ajouter un fichier, c'est l'inscrire dans la carte — `tests/map.test.ts`
échoue sinon.
