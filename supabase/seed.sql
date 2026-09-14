-- Données de départ de CConnect. Généré par scripts/generate-seed-sql.mjs.
-- Ne pas éditer à la main : modifier src/lib/data/*.ts puis relancer
--   npm run seed:sql
--
-- À exécuter après les migrations. Ce fichier ne contient QUE des référentiels
-- (villes, entreprises) : les offres, expériences et contacts viennent des
-- membres.

insert into places (city, country_code, country_name, continent, lat, lng) values
  ('Casablanca', 'MA', 'Maroc', 'africa', 33.573, -7.59),
  ('Rabat', 'MA', 'Maroc', 'africa', 34.02, -6.841),
  ('Benguerir', 'MA', 'Maroc', 'africa', 32.236, -7.951),
  ('Tunis', 'TN', 'Tunisie', 'africa', 36.806, 10.181),
  ('Dakar', 'SN', 'Sénégal', 'africa', 14.716, -17.467),
  ('Paris', 'FR', 'France', 'europe', 48.857, 2.352),
  ('Toulouse', 'FR', 'France', 'europe', 43.605, 1.444),
  ('Lyon', 'FR', 'France', 'europe', 45.764, 4.836),
  ('Londres', 'GB', 'Royaume-Uni', 'europe', 51.507, -0.128),
  ('Berlin', 'DE', 'Allemagne', 'europe', 52.52, 13.405),
  ('Munich', 'DE', 'Allemagne', 'europe', 48.135, 11.582),
  ('Amsterdam', 'NL', 'Pays-Bas', 'europe', 52.37, 4.895),
  ('Dublin', 'IE', 'Irlande', 'europe', 53.35, -6.26),
  ('Madrid', 'ES', 'Espagne', 'europe', 40.417, -3.704),
  ('Lisbonne', 'PT', 'Portugal', 'europe', 38.722, -9.139),
  ('Zurich', 'CH', 'Suisse', 'europe', 47.377, 8.542),
  ('Montréal', 'CA', 'Canada', 'north_america', 45.502, -73.567),
  ('Toronto', 'CA', 'Canada', 'north_america', 43.653, -79.383),
  ('San Francisco', 'US', 'États-Unis', 'north_america', 37.775, -122.419),
  ('Seattle', 'US', 'États-Unis', 'north_america', 47.606, -122.332),
  ('New York', 'US', 'États-Unis', 'north_america', 40.713, -74.006),
  ('Dubaï', 'AE', 'Émirats arabes unis', 'asia', 25.205, 55.271),
  ('Bangalore', 'IN', 'Inde', 'asia', 12.972, 77.594),
  ('Singapour', 'SG', 'Singapour', 'asia', 1.352, 103.82),
  ('Tokyo', 'JP', 'Japon', 'asia', 35.676, 139.65),
  ('São Paulo', 'BR', 'Brésil', 'south_america', -23.55, -46.633),
  ('Sydney', 'AU', 'Australie', 'oceania', -33.869, 151.209)
on conflict (city, country_code) do nothing;

insert into companies (name, slug, normalized_name, website, industry, linkedin_url, description, headquarters_id) values
  ('Microsoft', 'microsoft', public.canonical_company_name('Microsoft'), 'https://microsoft.com', 'software', 'https://www.linkedin.com/company/microsoft', 'Éditeur logiciel et fournisseur cloud (Azure). Programmes de stage structurés en Europe, sponsoring de visa fréquent.', (select id from places where city = 'Paris' limit 1)),
  ('Google', 'google', public.canonical_company_name('Google'), 'https://google.com', 'software', 'https://www.linkedin.com/company/google', 'Recrute principalement via son portail carrières ; le référencement par un ancien stagiaire pèse lourd.', (select id from places where city = 'Zurich' limit 1)),
  ('Amazon Web Services', 'amazon-web-services', public.canonical_company_name('Amazon Web Services'), 'https://aws.amazon.com', 'software', 'https://www.linkedin.com/company/amazon-web-services', 'Filiale cloud d''Amazon. Processus en deux temps : test en ligne, puis entretiens sur les Leadership Principles.', (select id from places where city = 'Dublin' limit 1)),
  ('Thales', 'thales', public.canonical_company_name('Thales'), 'https://thalesgroup.com', 'industry', 'https://www.linkedin.com/company/thales', 'Défense, aéronautique et sécurité. Stages conventionnés, souvent en environnement contraint (C, Ada).', (select id from places where city = 'Toulouse' limit 1)),
  ('Airbus', 'airbus', public.canonical_company_name('Airbus'), 'https://airbus.com', 'industry', 'https://www.linkedin.com/company/airbus', 'Aéronautique. Beaucoup de stages école, dossier attendu en anglais.', (select id from places where city = 'Toulouse' limit 1)),
  ('Capgemini', 'capgemini', public.canonical_company_name('Capgemini'), 'https://capgemini.com', 'consulting', 'https://www.linkedin.com/company/capgemini', 'ESN présente à Casablanca et Rabat. Missions bancaires, forte demande cloud et DevOps.', (select id from places where city = 'Casablanca' limit 1)),
  ('OCP Group', 'ocp-group', public.canonical_company_name('OCP Group'), 'https://ocpgroup.ma', 'industry', 'https://www.linkedin.com/company/ocpgroup', 'Groupe industriel marocain, partenaire historique de l''UM6P. Recrute chaque été sur le campus de Benguerir.', (select id from places where city = 'Benguerir' limit 1)),
  ('Orange Cyberdefense', 'orange-cyberdefense', public.canonical_company_name('Orange Cyberdefense'), 'https://orangecyberdefense.com', 'telecom', 'https://www.linkedin.com/company/orange-cyberdefense', 'Entité cybersécurité du groupe Orange. SOC en rotation, bon point d''entrée pour un premier poste en défense.', (select id from places where city = 'Lyon' limit 1)),
  ('Dataiku', 'dataiku', public.canonical_company_name('Dataiku'), 'https://dataiku.com', 'software', 'https://www.linkedin.com/company/dataiku', 'Plateforme de science des données. Stages orientés industrialisation de modèles.', (select id from places where city = 'Paris' limit 1)),
  ('Booking.com', 'booking-com', public.canonical_company_name('Booking.com'), 'https://booking.com', 'software', 'https://www.linkedin.com/company/booking-com', 'Voyage en ligne. Équipes data importantes, prise en charge du visa pour les Pays-Bas.', (select id from places where city = 'Amsterdam' limit 1)),
  ('Shopify', 'shopify', public.canonical_company_name('Shopify'), 'https://shopify.com', 'software', 'https://www.linkedin.com/company/shopify', 'Commerce en ligne. Recrutement entièrement à distance.', (select id from places where city = 'Toronto' limit 1)),
  ('Stripe', 'stripe', public.canonical_company_name('Stripe'), 'https://stripe.com', 'finance', 'https://www.linkedin.com/company/stripe', 'Infrastructure de paiement. Sélection technique exigeante.', (select id from places where city = 'Dublin' limit 1)),
  ('Attijariwafa Bank', 'attijariwafa-bank', public.canonical_company_name('Attijariwafa Bank'), 'https://attijariwafabank.com', 'finance', 'https://www.linkedin.com/company/attijariwafa-bank', 'Première banque marocaine. Sujets data et conformité (loi 09-08).', (select id from places where city = 'Casablanca' limit 1)),
  ('Inwi', 'inwi', public.canonical_company_name('Inwi'), 'https://inwi.ma', 'telecom', 'https://www.linkedin.com/company/inwi', 'Opérateur télécom marocain. Stages réseau cœur et radio à Rabat.', (select id from places where city = 'Rabat' limit 1)),
  ('Deloitte', 'deloitte', public.canonical_company_name('Deloitte'), 'https://deloitte.com', 'consulting', 'https://www.linkedin.com/company/deloitte', 'Conseil et audit. Pôle cyber actif au Moyen-Orient et en Europe du Sud.', (select id from places where city = 'Dubaï' limit 1)),
  ('Siemens', 'siemens', public.canonical_company_name('Siemens'), 'https://siemens.com', 'industry', 'https://www.linkedin.com/company/siemens', 'Industrie et automatisation. Sujets de recherche sur la sécurité des protocoles industriels.', (select id from places where city = 'Munich' limit 1))
on conflict (normalized_name) do nothing;
