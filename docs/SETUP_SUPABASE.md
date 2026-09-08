# Brancher Supabase

Le mode démo suffit pour développer l'interface. Suis ce guide si tu travailles
sur les données, l'authentification ou la RLS.

## 1. Créer le projet

1. Créer un projet sur <https://supabase.com> (plan gratuit).
2. Noter l'**URL du projet** et la clé **anon / publishable**
   (*Project Settings → API*).

## 2. Appliquer le schéma

Dans le **SQL Editor** de Supabase, exécuter dans l'ordre :

1. `supabase/migrations/0001_init.sql` — types, tables, triggers, RLS
2. `supabase/migrations/0002_member_contact.sql` — coordonnées du membre
3. `supabase/migrations/0003_companies_offers_contacts.sql` — entreprises, offres, contacts structurés
4. `supabase/migrations/0004_scale.sql` — index, RLS en InitPlan, agrégats, quota d'écriture
5. `supabase/migrations/0005_hardening.sql` — corrections de l'audit de sécurité
6. `supabase/seed.sql` — villes et entreprises de départ

Les cinq migrations sont à appliquer **dans l'ordre** : chacune suppose la
précédente. `0004` et `0005` sont rejouables sans dommage (tout y est
`if not exists` ou `or replace`).

`npm test` rejoue ces migrations dans un Postgres jetable et attaque le
résultat (`tests/database-security.test.ts`) : si l'une d'elles ne s'applique
plus sur une base vierge, la CI le dit.

Avec la CLI Supabase, l'équivalent est :

```bash
supabase link --project-ref <ref>
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

## 3. Configurer l'authentification

*Authentication → Providers* :

- activer **Email**, en désactivant le mot de passe (lien magique seul) ;
- *URL Configuration* → **Site URL** : `http://localhost:3000` en local,
  l'URL de production ensuite ;
- **Redirect URLs** : ajouter `http://localhost:3000/auth/callback` et
  `https://<domaine-de-prod>/auth/callback`.

### Restreindre les inscriptions au domaine UM6P — **étape obligatoire**

Le trigger `enforce_allowed_email_domain` empêche la création d'un *profil*
hors périmètre, mais il intervient trop tard : n'importe qui sur Internet
pouvait déclencher l'envoi d'un lien de connexion vers n'importe quelle
adresse, avec deux conséquences — du courrier parti au nom de l'école, et
surtout l'épuisement du quota horaire d'emails d'authentification, qui bloque
la connexion de **tous** les membres.

La migration `0005` fournit la fonction `public.restrict_signup_domain`.
**Elle ne fait rien tant qu'elle n'est pas branchée** :

1. *Authentication → Hooks* → **Before User Created** ;
2. choisir *Postgres function* et sélectionner `public.restrict_signup_domain` ;
3. enregistrer, puis vérifier immédiatement :
   - une adresse `@um6p.ma` reçoit bien son lien ;
   - une adresse extérieure est refusée, et aucune ligne n'apparaît dans
     `auth.users`.

> La forme exacte de la charge utile du hook a changé selon les versions de
> Supabase. La fonction lit l'adresse sous `user.email`, `claims.email` ou
> `email`, dans cet ordre. Si le test ci-dessus refuse une adresse légitime,
> c'est cette lecture qu'il faut ajuster — pas la peine de chercher ailleurs.

Configurer aussi un **SMTP personnalisé** (*Project Settings → Auth → SMTP*) :
le quota du serveur intégré est bas, et il est partagé par tout le projet.

Pour autoriser un autre domaine :

```sql
insert into allowed_email_domains (domain, note) values ('exemple.ma', 'Partenaire');
```

## 4. Variables d'environnement

```bash
cp .env.example .env.local
```

puis renseigner :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=um6p.ma
```

Redémarrer `npm run dev` : le bandeau « mode démo » disparaît et
l'authentification devient réelle.

> ⚠️ Ne jamais mettre la clé `service_role` dans une variable `NEXT_PUBLIC_*`,
> ni dans le dépôt. Elle contourne la RLS.

## 5. Premier compte et premier modérateur

1. Se connecter avec une adresse `@um6p.ma` → `/onboarding` crée le profil.
2. Promouvoir un modérateur depuis le SQL Editor :

```sql
update profiles set role = 'moderator' where id = '<uuid du profil>';
```

Le rôle n'est **pas** modifiable depuis l'application : un trigger annule toute
tentative de changement par un membre non modérateur.

## 6. Vérifier la RLS

À faire au moins une fois après toute modification des politiques :

```sql
-- Doit renvoyer 0 ligne : un visiteur non authentifié ne voit rien.
set role anon;
select count(*) from contacts;
reset role;
```

## Déploiement

Le projet se déploie tel quel sur Vercel : importer le dépôt, ajouter les trois
variables d'environnement, déployer. Penser à ajouter l'URL de production dans
les *Redirect URLs* de Supabase.
