-- Données de départ du CC Career Network.
-- À exécuter après supabase/migrations/0001_init.sql.
--
-- Ce fichier ne contient QUE des référentiels (villes, entreprises connues).
-- Aucune expérience ni aucun contact : ces données viennent des membres.

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

insert into companies (name, slug, website) values
  ('Microsoft', 'microsoft', 'https://microsoft.com'),
  ('Google', 'google', 'https://google.com'),
  ('Amazon Web Services', 'aws', 'https://aws.amazon.com'),
  ('Thales', 'thales', 'https://thalesgroup.com'),
  ('Airbus', 'airbus', 'https://airbus.com'),
  ('Capgemini', 'capgemini', 'https://capgemini.com'),
  ('OCP Group', 'ocp-group', 'https://ocpgroup.ma'),
  ('Orange Cyberdefense', 'orange-cyberdefense', 'https://orangecyberdefense.com'),
  ('Dataiku', 'dataiku', 'https://dataiku.com'),
  ('Booking.com', 'booking', 'https://booking.com'),
  ('Shopify', 'shopify', 'https://shopify.com'),
  ('Stripe', 'stripe', 'https://stripe.com'),
  ('Attijariwafa Bank', 'attijariwafa-bank', 'https://attijariwafabank.com'),
  ('Inwi', 'inwi', 'https://inwi.ma'),
  ('Deloitte', 'deloitte', 'https://deloitte.com'),
  ('Siemens', 'siemens', 'https://siemens.com')
on conflict (slug) do nothing;
