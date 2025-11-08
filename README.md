# Monteiro - Gestion des Heures

## 📋 Description

Application web moderne de gestion d'heures pour les restaurants Monteiro. Cette application permet de gérer les employés, planifier les horaires, suivre les présences et générer des rapports de paie.

## ✨ Fonctionnalités

### 🏢 Gestion Multi-Localisations
- Support pour plusieurs restaurants (MTL-Nord, H-Bourassa)
- Navigation facile entre les localisations
- Données séparées par localisation

### 👥 Gestion des Employés
- Ajout, modification et suppression d'employés
- Masquage/démasquage des numéros d'assurance sociale (NAS)
- Soft delete pour préserver l'historique
- Modales de confirmation pour éviter les suppressions accidentelles

### 📅 Planification d'Horaires
- Interface intuitive pour assigner les employés aux horaires
- Support pour les shifts de différents employes
- Validation des conflits d'horaires
- Design responsive pour mobile et desktop

### 💰 Rapports de Paie
- Génération automatique des rapports d'heures
- Export en format PDF avec jsPDF
- Formatage professionnel des données
- Suivi par période et par employé

### 🔐 Sécurité
- Authentification Supabase
- Row Level Security (RLS) pour la protection des données
- Gestion des sessions sécurisées
- Variables d'environnement pour la configuration

## 🛠️ Technologies

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS + Radix UI
- **Build Tool**: Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **PDF Export**: jsPDF + jsPDF AutoTable
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase

### Installation

1. **Cloner le repository**
```bash
git clone https://github.com/VOTRE_USERNAME/monteiro-gestion-heures.git
cd monteiro-gestion-heures
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Supabase**
   - Créez un projet sur [supabase.com](https://supabase.com)
   - Récupérez votre URL et clé publique
   - Créez un fichier `.env` à la racine:
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_supabase
```

4. **Lancer l'application en développement**
```bash
npm run dev
```

L'application sera accessible à `http://localhost:5173`

## 🗃️ Structure de la Base de Données

### Tables Principales

#### `employees`
- `id`: UUID (clé primaire)
- `name`: Nom de l'employé
- `nas`: Numéro d'assurance sociale (masquable)
- `is_active`: Statut d'activité (soft delete)
- `created_at`: Date de création
- `location_id`: Identifiant de la localisation

#### `work_sessions`
- `id`: UUID (clé primaire)
- `employee_id`: Référence à l'employé
- `date`: Date de la session de travail
- `start_time`: Heure de début
- `end_time`: Heure de fin
- `location_id`: Identifiant de la localisation

#### `report_data`
- `id`: UUID (clé primaire)
- `employee_id`: Référence à l'employé
- `period_start`: Début de période
- `period_end`: Fin de période
- `total_hours`: Total d'heures
- `location_id`: Identifiant de la localisation

## 🏗️ Build et Déploiement

### Build pour Production
```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/`

### Déploiement sur Hostinger
1. Build l'application: `npm run build`
2. Uploadez le contenu du dossier `dist/` vers votre serveur Hostinger
3. Configurez le sous-domaine `calendar.monteiromtlnord.com`
4. Assurez-vous que les variables d'environnement Supabase sont configurées

## 📱 Design Responsive

L'application est optimisée pour tous les appareils:
- **Desktop**: Interface complète avec toutes les fonctionnalités
- **Tablet**: Adaptation automatique des layouts
- **Mobile**: Interface simplifiée et touch-friendly

## 🔄 Version

**Version Actuelle**: v3.2.9

### Historique des Versions
- v3.2.9: Favicon "M" blanc, interface optimisée
- v3.2.8: Modales de confirmation, soft delete
- v3.2.7: Améliorations mobile, dates visibles
- v3.2.6: Suppression attribution MiniMax
- v3.2.5: Soft delete avec `is_active`
- v3.2.4: Modales de confirmation
- v3.2.3: Optimisation mobile
- v3.2.2: Affichage des noms complets
- v3.2.1: Corrections interface mobile

## 🤝 Contribution

Pour contribuer au projet:

1. Fork le repository
2. Créez une branche pour votre feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📞 Support

Pour toute question ou assistance:
- Créez une issue sur GitHub
- Consultez la documentation Supabase: [docs.supabase.com](https://docs.supabase.com)

## 📄 License

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🔐 Sécurité

⚠️ **Important**: Ne jamais commiter les fichiers `.env` ou des clés API dans le repository. Utilisez les variables d'environnement et les clés publiques uniquement.

## 🚀 Production

Application déployée en production sur: `calendar.monteiromtlnord.com`

---

**Développé pour Monteiro Restaurant** - Application de gestion moderne et intuitive