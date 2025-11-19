# 🔒 Corrections de Sécurité - Projet Monteiro

**Date d'application** : 18 novembre 2025  
**Version** : v3.3.0 (après corrections)  
**Status** : ✅ Corrections appliquées

---

## ✅ Corrections Appliquées

### 1. 🔐 Migration des Clés API vers Variables d'Environnement

**Problème identifié :**
- Clés API Supabase exposées en dur dans `src/lib/supabase.ts`
- Risque de sécurité si le code est committé sur un dépôt public

**Solution appliquée :**

#### Fichier créé : `.env`
```env
VITE_SUPABASE_URL=https://nskzqvpgtsxufdeanbpi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- ⚠️ Ce fichier est automatiquement ignoré par Git (`.gitignore`)
- ✅ Contient les vraies clés pour le développement local

#### Fichier modifié : `src/lib/supabase.ts`
**Avant :**
```typescript
const supabaseUrl = "https://nskzqvpgtsxufdeanbpi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Après :**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Configuration Supabase manquante !');
}
```

**Avantages :**
- ✅ Clés API protégées et non commitées
- ✅ Validation automatique au démarrage
- ✅ Message d'erreur clair si configuration manquante
- ✅ Facilite les déploiements multi-environnements

---

### 2. 🚫 Désactivation du Mode Test en Production

**Problème identifié :**
- Mode test activé par défaut dans `App.tsx` (ligne 19)
- Contourne l'authentification Supabase
- Dangereux en production

**Solution appliquée :**

#### Fichier modifié : `src/App.tsx`
**Avant :**
```typescript
const [testMode, setTestMode] = useState(true); // ⚠️ DANGEREUX
```

**Après :**
```typescript
const [testMode, setTestMode] = useState(false); // ✅ SÉCURISÉ
```

**Comportement :**
- En développement : Mettez manuellement à `true` si besoin de tester sans auth
- En production : **TOUJOURS `false`** → authentification obligatoire

---

## 📋 Checklist de Déploiement

### Développement Local

1. **Vérifier que le fichier `.env` existe**
   ```bash
   ls -la .env
   ```

2. **Installer les dépendances (si pas déjà fait)**
   ```bash
   npm install
   ```

3. **Démarrer en mode développement**
   ```bash
   npm run dev
   ```

4. **Tester l'application**
   - Ouvrir `http://localhost:5173`
   - Vérifier que la page de login s'affiche (mode test désactivé)
   - Tester une connexion avec les identifiants Supabase

---

### Déploiement sur Hostinger (Production)

#### Étape 1 : Préparation du Build

1. **Vérifier que `.env` est bien présent localement**
   ```bash
   cat .env
   # Doit afficher :
   # VITE_SUPABASE_URL=...
   # VITE_SUPABASE_ANON_KEY=...
   ```

2. **Construire l'application pour production**
   ```bash
   npm run build
   ```

   Vite va automatiquement :
   - ✅ Lire les variables depuis `.env`
   - ✅ Les injecter dans le code JavaScript compilé
   - ✅ Générer les fichiers dans `dist/`

3. **Vérifier le build**
   ```bash
   ls -lh dist/
   # Doit contenir :
   # - index.html
   # - assets/ (fichiers JS et CSS)
   # - favicons
   ```

#### Étape 2 : Upload sur Hostinger

**Option A : Via FTP/SFTP (recommandé)**

1. Se connecter via FileZilla ou autre client FTP
   - Hôte : `ftp.monteiromtlnord.com`
   - Port : 21 (FTP) ou 22 (SFTP)
   - Identifiants : fournis par Hostinger

2. Naviguer vers le répertoire du sous-domaine
   ```
   /public_html/calendar/
   ```

3. **Supprimer l'ancien contenu** (sauf `.htaccess` si existant)
   ```
   Sélectionner tous les fichiers → Supprimer
   ```

4. **Uploader le nouveau contenu**
   ```
   Uploader tout le contenu du dossier dist/
   ```

**Option B : Via cPanel File Manager**

1. Se connecter à cPanel Hostinger
2. Ouvrir "File Manager"
3. Naviguer vers `/public_html/calendar/`
4. Supprimer l'ancien contenu
5. Uploader le contenu de `dist/`

#### Étape 3 : Configuration Serveur (Important !)

**Créer/Vérifier le fichier `.htaccess`** dans `/public_html/calendar/` :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirection HTTPS (recommandé)
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # Routing pour SPA React
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Compression Gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Cache des assets statiques
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

#### Étape 4 : Vérification Post-Déploiement

1. **Accéder à l'URL de production**
   ```
   https://calendar.monteiromtlnord.com
   ```

2. **Vérifier la page de login**
   - ✅ La page de login doit s'afficher (pas de "MODE TEST")
   - ✅ Aucune erreur dans la console navigateur (F12)

3. **Tester l'authentification**
   - Se connecter avec un compte Supabase valide
   - Vérifier l'accès aux pages Employés, Horaires, Rapports

4. **Vérifier la connexion Supabase**
   - Ouvrir la console navigateur (F12) → Network
   - Vérifier les appels API vers `nskzqvpgtsxufdeanbpi.supabase.co`
   - ✅ Status 200 OK

---

## ⚠️ Important : Sécurité Continue

### Ce qu'il FAUT faire :

✅ **Toujours** garder le fichier `.env` local uniquement  
✅ **Ne jamais** commiter `.env` sur Git  
✅ **Toujours** vérifier que `testMode = false` avant le build de production  
✅ **Régulièrement** auditer les Row Level Security (RLS) sur Supabase  
✅ **Utiliser** des clés API différentes pour dev/staging/prod (recommandé)  

### Ce qu'il NE FAUT PAS faire :

❌ Partager les clés API par email ou chat non chiffré  
❌ Stocker les clés dans des fichiers non protégés  
❌ Utiliser les mêmes clés pour développement et production  
❌ Désactiver RLS sur Supabase sans raison valide  
❌ Laisser `testMode = true` en production  

---

## 📊 Variables d'Environnement Supportées

### Variables Actuelles

| Variable | Requis | Description |
|----------|--------|-------------|
| `VITE_SUPABASE_URL` | ✅ Oui | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ Oui | Clé publique (anon) Supabase |

### Variables Futures (Recommandées)

| Variable | Description |
|----------|-------------|
| `VITE_APP_ENV` | Environnement (`development` / `production`) |
| `VITE_API_TIMEOUT` | Timeout des requêtes API (ms) |
| `VITE_ENABLE_ANALYTICS` | Activer Google Analytics (`true` / `false`) |
| `VITE_SENTRY_DSN` | Clé Sentry pour monitoring erreurs |

---

## 🔄 Procédure de Rollback (En cas de problème)

### Si le site ne fonctionne plus après déploiement :

1. **Vérifier les logs serveur** (cPanel → Error Logs)

2. **Restaurer l'ancienne version**
   - Uploader l'ancien contenu du dossier `dist/` (si sauvegardé)

3. **Vérifier la configuration `.env`**
   ```bash
   # Reconstruire avec les bonnes variables
   npm run build
   ```

4. **Contacter le support Hostinger** si problème serveur

---

## 📝 Journal des Modifications

| Date | Version | Modifications |
|------|---------|--------------|
| 2025-11-18 | v3.3.0 | ✅ Migration clés API → `.env`<br>✅ Désactivation mode test |
| 2025-11-08 | v3.2.9 | Favicon "M" blanc restauré |
| - | v3.2.8 | Modales confirmation, soft delete |

---

## 🆘 Support et Contact

**En cas de problème :**

1. Consulter la documentation Supabase : https://supabase.com/docs
2. Vérifier les logs serveur (Hostinger cPanel)
3. Consulter le fichier d'analyse : `docs/analyse_complete_monteiro.md`
4. Contacter le développeur ou support technique

---

## ✅ Validation Finale

Après déploiement, vérifier :

- [ ] Site accessible sur `https://calendar.monteiromtlnord.com`
- [ ] Page de login s'affiche correctement
- [ ] Authentification fonctionne
- [ ] Pas de badge "MODE TEST" visible
- [ ] Console navigateur sans erreurs
- [ ] Appels API Supabase réussissent (Status 200)
- [ ] Navigation entre restaurants fonctionne
- [ ] CRUD employés opérationnel
- [ ] Planification horaires opérationnelle
- [ ] Export PDF rapports fonctionne

---

**🎉 Corrections de sécurité terminées !**  
**Le projet est maintenant prêt pour un déploiement sécurisé en production.**
