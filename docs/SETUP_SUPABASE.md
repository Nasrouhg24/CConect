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
2. `supabase/seed.sql` — villes et entreprises de départ

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

Restreindre les inscriptions au domaine UM6P est déjà assuré côté base par le
trigger `enforce_allowed_email_domain`. Pour autoriser un autre domaine :

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
