import { companySlug, normalizeCompanyName } from "../company-name";
import type {
  Author,
  Company,
  Contact,
  Experience,
  Industry,
  JobOffer,
} from "../types";
import { place } from "./places";

/**
 * Jeu de données de démonstration — 100 % fictif.
 *
 * Il alimente le mode démo (aucune variable Supabase configurée) pour qu'un
 * nouveau contributeur puisse lancer `npm run dev` et voir l'application
 * complète sans compte ni base de données. Les personnes citées n'existent pas.
 */

interface CompanySeed {
  name: string;
  website: string | null;
  industry: Industry;
  description: string;
  linkedinUrl: string | null;
  headquartersId: string | null;
}

const company = (seed: CompanySeed): Company => {
  const slug = companySlug(seed.name);
  return {
    id: `c-${slug}`,
    name: seed.name,
    slug,
    normalizedName: normalizeCompanyName(seed.name),
    website: seed.website,
    logoUrl: null,
    industry: seed.industry,
    description: seed.description,
    linkedinUrl: seed.linkedinUrl,
    headquarters: seed.headquartersId ? place(seed.headquartersId) : null,
  };
};

export const COMPANIES: Company[] = [
  company({
    name: "Microsoft",
    website: "https://microsoft.com",
    industry: "software",
    description:
      "Éditeur logiciel et fournisseur cloud (Azure). Programmes de stage structurés en Europe, sponsoring de visa fréquent.",
    linkedinUrl: "https://www.linkedin.com/company/microsoft",
    headquartersId: "p-paris",
  }),
  company({
    name: "Google",
    website: "https://google.com",
    industry: "software",
    description:
      "Recrute principalement via son portail carrières ; le référencement par un ancien stagiaire pèse lourd.",
    linkedinUrl: "https://www.linkedin.com/company/google",
    headquartersId: "p-zurich",
  }),
  company({
    name: "Amazon Web Services",
    website: "https://aws.amazon.com",
    industry: "software",
    description:
      "Filiale cloud d'Amazon. Processus en deux temps : test en ligne, puis entretiens sur les Leadership Principles.",
    linkedinUrl: "https://www.linkedin.com/company/amazon-web-services",
    headquartersId: "p-dublin",
  }),
  company({
    name: "Thales",
    website: "https://thalesgroup.com",
    industry: "industry",
    description:
      "Défense, aéronautique et sécurité. Stages conventionnés, souvent en environnement contraint (C, Ada).",
    linkedinUrl: "https://www.linkedin.com/company/thales",
    headquartersId: "p-toulouse",
  }),
  company({
    name: "Airbus",
    website: "https://airbus.com",
    industry: "industry",
    description:
      "Aéronautique. Beaucoup de stages école, dossier attendu en anglais.",
    linkedinUrl: "https://www.linkedin.com/company/airbus",
    headquartersId: "p-toulouse",
  }),
  company({
    name: "Capgemini",
    website: "https://capgemini.com",
    industry: "consulting",
    description:
      "ESN présente à Casablanca et Rabat. Missions bancaires, forte demande cloud et DevOps.",
    linkedinUrl: "https://www.linkedin.com/company/capgemini",
    headquartersId: "p-casablanca",
  }),
  company({
    name: "OCP Group",
    website: "https://ocpgroup.ma",
    industry: "industry",
    description:
      "Groupe industriel marocain, partenaire historique de l'UM6P. Recrute chaque été sur le campus de Benguerir.",
    linkedinUrl: "https://www.linkedin.com/company/ocpgroup",
    headquartersId: "p-benguerir",
  }),
  company({
    name: "Orange Cyberdefense",
    website: "https://orangecyberdefense.com",
    industry: "telecom",
    description:
      "Entité cybersécurité du groupe Orange. SOC en rotation, bon point d'entrée pour un premier poste en défense.",
    linkedinUrl: "https://www.linkedin.com/company/orange-cyberdefense",
    headquartersId: "p-lyon",
  }),
  company({
    name: "Dataiku",
    website: "https://dataiku.com",
    industry: "software",
    description:
      "Plateforme de science des données. Stages orientés industrialisation de modèles.",
    linkedinUrl: "https://www.linkedin.com/company/dataiku",
    headquartersId: "p-paris",
  }),
  company({
    name: "Booking.com",
    website: "https://booking.com",
    industry: "software",
    description:
      "Voyage en ligne. Équipes data importantes, prise en charge du visa pour les Pays-Bas.",
    linkedinUrl: "https://www.linkedin.com/company/booking-com",
    headquartersId: "p-amsterdam",
  }),
  company({
    name: "Shopify",
    website: "https://shopify.com",
    industry: "software",
    description: "Commerce en ligne. Recrutement entièrement à distance.",
    linkedinUrl: "https://www.linkedin.com/company/shopify",
    headquartersId: "p-toronto",
  }),
  company({
    name: "Stripe",
    website: "https://stripe.com",
    industry: "finance",
    description: "Infrastructure de paiement. Sélection technique exigeante.",
    linkedinUrl: "https://www.linkedin.com/company/stripe",
    headquartersId: "p-dublin",
  }),
  company({
    name: "Attijariwafa Bank",
    website: "https://attijariwafabank.com",
    industry: "finance",
    description:
      "Première banque marocaine. Sujets data et conformité (loi 09-08).",
    linkedinUrl: "https://www.linkedin.com/company/attijariwafa-bank",
    headquartersId: "p-casablanca",
  }),
  company({
    name: "Inwi",
    website: "https://inwi.ma",
    industry: "telecom",
    description:
      "Opérateur télécom marocain. Stages réseau cœur et radio à Rabat.",
    linkedinUrl: "https://www.linkedin.com/company/inwi",
    headquartersId: "p-rabat",
  }),
  company({
    name: "Deloitte",
    website: "https://deloitte.com",
    industry: "consulting",
    description:
      "Conseil et audit. Pôle cyber actif au Moyen-Orient et en Europe du Sud.",
    linkedinUrl: "https://www.linkedin.com/company/deloitte",
    headquartersId: "p-dubai",
  }),
  company({
    name: "Siemens",
    website: "https://siemens.com",
    industry: "industry",
    description:
      "Industrie et automatisation. Sujets de recherche sur la sécurité des protocoles industriels.",
    linkedinUrl: "https://www.linkedin.com/company/siemens",
    headquartersId: "p-munich",
  }),
];

const COMPANIES_BY_SLUG = new Map(COMPANIES.map((c) => [c.slug, c]));

function co(slug: string): Company {
  const found = COMPANIES_BY_SLUG.get(slug);
  if (!found) throw new Error(`Entreprise inconnue: ${slug}`);
  return found;
}

const author = (
  id: string,
  fullName: string,
  campus: Author["campus"],
  status: Author["status"],
  promotion: number,
  linkedinUrl: string | null = null,
  contactEmail: string | null = null,
): Author => ({
  id,
  fullName,
  campus,
  status,
  promotion,
  linkedinUrl,
  contactEmail,
});

export const AUTHORS: Author[] = [
  author("u-ahmed", "Ahmed B.", "rabat", "alumni", 2022, "https://www.linkedin.com/in/example-ahmed", "ahmed.b@um6p.ma"),
  author("u-salma", "Salma T.", "benguerir", "alumni", 2021, "https://www.linkedin.com/in/example-salma", "salma.t@um6p.ma"),
  author("u-youssef", "Youssef E.", "rabat", "student", 2026, null, "youssef.e@um6p.ma"),
  author("u-imane", "Imane K.", "benguerir", "student", 2025, "https://www.linkedin.com/in/example-imane", "imane.k@um6p.ma"),
  author("u-mehdi", "Mehdi A.", "rabat", "alumni", 2023),
  author("u-nour", "Nour H.", "benguerir", "alumni", 2020, "https://www.linkedin.com/in/example-nour", "nour.h@um6p.ma"),
  author("u-omar", "Omar Z.", "rabat", "student", 2027),
  author("u-hiba", "Hiba L.", "benguerir", "student", 2026, null, "hiba.l@um6p.ma"),
];

const AUTHORS_BY_ID = new Map(AUTHORS.map((a) => [a.id, a]));

function au(id: string): Author {
  const found = AUTHORS_BY_ID.get(id);
  if (!found) throw new Error(`Membre inconnu: ${id}`);
  return found;
}

export const EXPERIENCES: Experience[] = [
  {
    id: "e-1", author: au("u-ahmed"), company: co("microsoft"), place: place("p-paris"),
    domain: "cybersecurity", kind: "pfe", year: 2022,
    title: "Security Engineer Intern",
    summary:
      "Détection de menaces sur Azure Sentinel, équipe de 6 personnes. Process : 3 entretiens dont un technique en anglais.",
    createdAt: "2025-11-02T10:00:00Z",
  },
  {
    id: "e-2", author: au("u-salma"), company: co("google"), place: place("p-zurich"),
    domain: "software_engineering", kind: "internship", year: 2021,
    title: "Software Engineering Intern",
    summary:
      "Backend Ads, 12 semaines. Candidature via le portail carrières, référencement par une alumni.",
    createdAt: "2025-11-04T09:20:00Z",
  },
  {
    id: "e-3", author: au("u-mehdi"), company: co("thales"), place: place("p-toulouse"),
    domain: "embedded", kind: "pfa", year: 2023,
    title: "Stagiaire systèmes embarqués",
    summary: "Firmware avionique, environnement C/Ada. Convention de stage signée via l'école.",
    createdAt: "2025-11-06T15:40:00Z",
  },
  {
    id: "e-4", author: au("u-imane"), company: co("ocp-group"), place: place("p-benguerir"),
    domain: "data", kind: "internship", year: 2025,
    title: "Data Analyst Intern",
    summary: "Tableaux de bord de production, Python et Power BI.",
    createdAt: "2025-11-08T08:10:00Z",
  },
  {
    id: "e-5", author: au("u-nour"), company: co("booking-com"), place: place("p-amsterdam"),
    domain: "data", kind: "job", year: 2020,
    title: "Data Scientist",
    summary: "Recrutée après un stage. Le sponsor de visa est pris en charge par l'entreprise.",
    createdAt: "2025-11-09T11:00:00Z",
  },
  {
    id: "e-6", author: au("u-youssef"), company: co("capgemini"), place: place("p-casablanca"),
    domain: "cloud_devops", kind: "pfa", year: 2026,
    title: "DevOps Intern",
    summary: "Mise en place de pipelines GitLab CI pour des clients bancaires.",
    createdAt: "2025-11-11T13:25:00Z",
  },
  {
    id: "e-7", author: au("u-hiba"), company: co("orange-cyberdefense"), place: place("p-lyon"),
    domain: "cybersecurity", kind: "internship", year: 2026,
    title: "SOC Analyst Intern",
    summary: "Analyse d'alertes niveau 1, rotation sur 3 mois.",
    createdAt: "2025-11-12T16:00:00Z",
  },
  {
    id: "e-8", author: au("u-omar"), company: co("amazon-web-services"), place: place("p-dublin"),
    domain: "cloud_devops", kind: "internship", year: 2027,
    title: "Cloud Support Intern",
    summary: "Processus : test en ligne puis 2 entretiens comportementaux (Leadership Principles).",
    createdAt: "2025-11-14T09:45:00Z",
  },
  {
    id: "e-9", author: au("u-ahmed"), company: co("deloitte"), place: place("p-dubai"),
    domain: "cybersecurity", kind: "job", year: 2024,
    title: "Cyber Risk Consultant",
    summary: "Missions d'audit dans le secteur financier au Moyen-Orient.",
    createdAt: "2025-11-16T12:00:00Z",
  },
  {
    id: "e-10", author: au("u-salma"), company: co("dataiku"), place: place("p-paris"),
    domain: "ai_ml", kind: "pfe", year: 2021,
    title: "ML Engineer Intern",
    summary: "Industrialisation de modèles, stack Python / Kubernetes.",
    createdAt: "2025-11-17T10:30:00Z",
  },
  {
    id: "e-11", author: au("u-mehdi"), company: co("siemens"), place: place("p-munich"),
    domain: "embedded", kind: "research", year: 2024,
    title: "Research Intern — Industrial IoT",
    summary: "Sécurité des protocoles industriels, publication interne.",
    createdAt: "2025-11-18T14:15:00Z",
  },
  {
    id: "e-12", author: au("u-imane"), company: co("inwi"), place: place("p-rabat"),
    domain: "networks", kind: "pfa", year: 2024,
    title: "Stagiaire ingénierie réseau",
    summary: "Dimensionnement du cœur de réseau mobile.",
    createdAt: "2025-11-19T09:00:00Z",
  },
  {
    id: "e-13", author: au("u-nour"), company: co("shopify"), place: place("p-montreal"),
    domain: "software_engineering", kind: "job", year: 2023,
    title: "Senior Developer",
    summary: "Équipe Payments. Recrutement 100 % à distance.",
    createdAt: "2025-11-20T18:40:00Z",
  },
  {
    id: "e-14", author: au("u-hiba"), company: co("attijariwafa-bank"), place: place("p-casablanca"),
    domain: "data", kind: "internship", year: 2025,
    title: "Stagiaire Data Governance",
    summary: "Cartographie des données clients, conformité loi 09-08.",
    createdAt: "2025-11-21T08:30:00Z",
  },
];

export const CONTACTS: Contact[] = [
  {
    id: "k-1", author: au("u-ahmed"), company: co("microsoft"), place: place("p-paris"),
    domain: "cybersecurity", firstName: "Sarah", lastName: "M.",
    position: "Cybersecurity Recruiter",
    linkedinUrl: "https://www.linkedin.com/in/example-sarah",
    notes: "Elle a recruté mon équipe de stage. Ouverte aux profils juniors CC.",
    createdAt: "2025-11-03T10:00:00Z",
  },
  {
    id: "k-2", author: au("u-salma"), company: co("google"), place: place("p-berlin"),
    domain: "software_engineering", firstName: "Jonas", lastName: "R.",
    position: "Software Engineer",
    linkedinUrl: "https://www.linkedin.com/in/example-jonas",
    notes: "Rencontré à une conférence — accepte de faire des referrals.",
    createdAt: "2025-11-05T11:30:00Z",
  },
  {
    id: "k-3", author: au("u-youssef"), company: co("capgemini"), place: place("p-casablanca"),
    domain: "cloud_devops", firstName: "Karim", lastName: null,
    position: "Delivery Manager",
    linkedinUrl: null,
    notes: "Ancien encadrant de stage, oriente vers les bonnes équipes.",
    createdAt: "2025-11-11T14:00:00Z",
  },
  {
    id: "k-4", author: au("u-nour"), company: co("stripe"), place: place("p-dublin"),
    domain: "software_engineering", firstName: "Aoife", lastName: "K.",
    position: "Engineering Manager",
    linkedinUrl: "https://www.linkedin.com/in/example-aoife",
    notes: "Contact via un meetup Fintech. Répond aux messages LinkedIn.",
    createdAt: "2025-11-13T09:10:00Z",
  },
  {
    id: "k-5", author: au("u-mehdi"), company: co("airbus"), place: place("p-toulouse"),
    domain: "embedded", firstName: "Claire", lastName: "D.",
    position: "Talent Acquisition",
    linkedinUrl: "https://www.linkedin.com/in/example-claire",
    notes: "Gère les stages école. Demande un CV en anglais.",
    createdAt: "2025-11-15T10:20:00Z",
  },
  {
    id: "k-6", author: au("u-imane"), company: co("ocp-group"), place: place("p-benguerir"),
    domain: "data", firstName: "Rachid", lastName: null,
    position: "Head of Data Platform",
    linkedinUrl: null,
    notes: "Encadrant de mon stage, recrute chaque été.",
    createdAt: "2025-11-16T08:00:00Z",
  },
  {
    id: "k-7", author: au("u-omar"), company: co("amazon-web-services"), place: place("p-london"),
    domain: "cloud_devops", firstName: "Daniel", lastName: "O.",
    position: "Solutions Architect",
    linkedinUrl: "https://www.linkedin.com/in/example-daniel",
    notes: "Je n'ai jamais travaillé chez AWS — contact rencontré à un hackathon.",
    createdAt: "2025-11-18T17:45:00Z",
  },
  {
    id: "k-8", author: au("u-hiba"), company: co("deloitte"), place: place("p-madrid"),
    domain: "cybersecurity", firstName: "Elena", lastName: "P.",
    position: "Senior Manager Cyber",
    linkedinUrl: "https://www.linkedin.com/in/example-elena",
    notes: "Alumni d'une école partenaire, accepte des cafés virtuels.",
    createdAt: "2025-11-19T12:00:00Z",
  },
  {
    id: "k-9", author: au("u-salma"), company: co("shopify"), place: place("p-toronto"),
    domain: "product_design", firstName: "Priya", lastName: null,
    position: "Product Designer",
    linkedinUrl: null,
    notes: "Mentore des étudiants sur le design produit.",
    createdAt: "2025-11-20T15:30:00Z",
  },
  {
    id: "k-10", author: au("u-ahmed"), company: co("microsoft"), place: place("p-seattle"),
    domain: "ai_ml", firstName: "David", lastName: "L.",
    position: "Applied Scientist",
    linkedinUrl: "https://www.linkedin.com/in/example-david",
    notes: "Contact d'un ami ; connaît bien les programmes de stage US.",
    createdAt: "2025-11-21T19:00:00Z",
  },
  {
    id: "k-11", author: au("u-youssef"), company: co("inwi"), place: place("p-rabat"),
    domain: "networks", firstName: "Amine", lastName: null,
    position: "Network Engineer",
    linkedinUrl: null,
    notes: "Peut transmettre un CV en interne à l'équipe réseau.",
    createdAt: "2025-11-22T09:15:00Z",
  },
  {
    id: "k-12", author: au("u-nour"), company: co("booking-com"), place: place("p-amsterdam"),
    domain: "data", firstName: "Lotte", lastName: "V.",
    position: "Data Science Manager",
    linkedinUrl: "https://www.linkedin.com/in/example-lotte",
    notes: "Mon ancienne manager. Recrute des stagiaires data chaque printemps.",
    createdAt: "2025-11-23T10:45:00Z",
  },
];

export const JOB_OFFERS: JobOffer[] = [
  {
    id: "o-1", company: co("microsoft"), place: place("p-berlin"), postedBy: au("u-ahmed"),
    title: "Cybersecurity Intern", domain: "cybersecurity", kind: "internship",
    durationMonths: 4,
    description:
      "Rejoindre le SOC EMEA : triage d'alertes, écriture de règles de détection, participation aux revues post-incident.",
    technologies: ["Cybersecurity", "SOC", "SIEM", "KQL"],
    url: "https://careers.microsoft.com",
    publishedAt: "2026-08-18T09:00:00Z",
    expiresAt: "2026-12-31T00:00:00Z",
  },
  {
    id: "o-2", company: co("capgemini"), place: place("p-casablanca"), postedBy: au("u-youssef"),
    title: "Stage PFE — Ingénierie DevOps", domain: "cloud_devops", kind: "pfe",
    durationMonths: 6,
    description:
      "Automatisation de déploiements pour des clients bancaires. Convention de stage PFE, encadrement par un architecte.",
    technologies: ["GitLab CI", "Docker", "Kubernetes", "Terraform"],
    url: null,
    publishedAt: "2026-08-25T08:30:00Z",
    expiresAt: null,
  },
  {
    id: "o-3", company: co("ocp-group"), place: place("p-benguerir"), postedBy: au("u-imane"),
    title: "Data Engineer Intern", domain: "data", kind: "internship",
    durationMonths: 5,
    description:
      "Construction de pipelines pour la plateforme data du groupe. Poste ouvert aux profils UM6P en priorité.",
    technologies: ["Python", "Airflow", "Spark", "Power BI"],
    url: "https://ocpgroup.ma/carrieres",
    publishedAt: "2026-09-01T07:00:00Z",
    expiresAt: "2026-11-30T00:00:00Z",
  },
  {
    id: "o-4", company: co("amazon-web-services"), place: place("p-dublin"), postedBy: au("u-omar"),
    title: "Cloud Support Engineer Intern", domain: "cloud_devops", kind: "internship",
    durationMonths: 6,
    description:
      "Support technique niveau 2 sur les services de calcul. Test en ligne puis deux entretiens comportementaux.",
    technologies: ["AWS", "Linux", "Networking", "Python"],
    url: "https://amazon.jobs",
    publishedAt: "2026-08-12T11:00:00Z",
    expiresAt: "2026-10-15T00:00:00Z",
  },
  {
    id: "o-5", company: co("orange-cyberdefense"), place: place("p-lyon"), postedBy: au("u-hiba"),
    title: "Analyste SOC — Alternance", domain: "cybersecurity", kind: "apprenticeship",
    durationMonths: 12,
    description:
      "Alternance d'un an au sein du centre opérationnel de sécurité. Rythme trois semaines entreprise, une semaine école.",
    technologies: ["Splunk", "MITRE ATT&CK", "Threat Intel"],
    url: null,
    publishedAt: "2026-07-30T14:00:00Z",
    expiresAt: null,
  },
  {
    id: "o-6", company: co("dataiku"), place: place("p-paris"), postedBy: au("u-salma"),
    title: "Machine Learning Engineer Intern", domain: "ai_ml", kind: "pfe",
    durationMonths: 6,
    description:
      "Industrialisation de modèles sur la plateforme : packaging, monitoring, tests de dérive.",
    technologies: ["Python", "MLflow", "Kubernetes"],
    url: "https://dataiku.com/careers",
    publishedAt: "2026-08-05T10:00:00Z",
    expiresAt: "2026-12-01T00:00:00Z",
  },
  {
    id: "o-7", company: co("thales"), place: place("p-toulouse"), postedBy: au("u-mehdi"),
    title: "Stage PFA — Systèmes embarqués critiques", domain: "embedded", kind: "pfa",
    durationMonths: 3,
    description:
      "Développement et validation de firmware avionique. Habilitation requise, dossier à déposer tôt.",
    technologies: ["C", "Ada", "RTOS", "DO-178C"],
    url: null,
    publishedAt: "2026-06-20T09:30:00Z",
    expiresAt: "2026-09-30T00:00:00Z",
  },
  {
    id: "o-8", company: co("booking-com"), place: place("p-amsterdam"), postedBy: au("u-nour"),
    title: "Data Science Internship", domain: "data", kind: "internship",
    durationMonths: 6,
    description:
      "Expérimentation et mesure d'impact sur le tunnel de réservation. Visa pris en charge.",
    technologies: ["Python", "SQL", "A/B testing"],
    url: "https://careers.booking.com",
    publishedAt: "2026-08-28T13:00:00Z",
    expiresAt: null,
  },
  {
    id: "o-9", company: co("inwi"), place: place("p-rabat"), postedBy: au("u-imane"),
    title: "Stagiaire Cœur de réseau mobile", domain: "networks", kind: "pfa",
    durationMonths: 4,
    description:
      "Dimensionnement et supervision du cœur de réseau 4G/5G. Stage basé au siège de Rabat.",
    technologies: ["5G Core", "Wireshark", "Python"],
    url: null,
    publishedAt: "2026-09-02T08:00:00Z",
    expiresAt: null,
  },
  {
    id: "o-10", company: co("deloitte"), place: place("p-dubai"), postedBy: au("u-ahmed"),
    title: "Cyber Risk Analyst — Graduate Programme", domain: "cybersecurity", kind: "job",
    durationMonths: null,
    description:
      "Programme jeune diplômé : audit de sécurité et conformité pour des clients du secteur financier.",
    technologies: ["ISO 27001", "NIST", "Audit"],
    url: "https://deloitte.com/careers",
    publishedAt: "2026-07-10T09:00:00Z",
    expiresAt: "2026-10-01T00:00:00Z",
  },
];
