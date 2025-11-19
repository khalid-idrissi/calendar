import { useState, useEffect } from 'react';
import { Employees } from './pages/Employees';
import { Schedule } from './pages/Schedule';
import { PayReport } from './pages/PayReport';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { useAuth } from './lib/AuthContext';
import { LogOut, Users, Calendar, DollarSign, Settings as SettingsIcon } from 'lucide-react';

type Restaurant = 'MTL_NORD' | 'HENRI_BOURASSA';
type TabType = 'employees' | 'schedule' | 'payreport' | 'settings';

function App() {
  const { user, loading, signOut } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant>('MTL_NORD');
  const [activeTab, setActiveTab] = useState<TabType>('employees');
  const [currentDate, setCurrentDate] = useState('');
  // Mode test pour contourner l'authentification (DÉSACTIVÉ EN PRODUCTION)
  // ⚠️ Ne jamais mettre à 'true' en production - uniquement pour le développement local
  const [testMode, setTestMode] = useState(false);

  // Mettre à jour la date en français
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      const dateStr = now.toLocaleDateString('fr-FR', options);
      // Capitaliser la première lettre
      setCurrentDate(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
    };
    
    updateDate();
    // Mettre à jour toutes les heures
    const interval = setInterval(updateDate, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Extraire le nom d'affichage de l'utilisateur
  const getUserDisplayName = () => {
    if (testMode) return 'Admin Test';
    
    if (!user) return '';
    
    // Essayer d'abord les métadonnées
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user.user_metadata?.name) {
      return user.user_metadata.name;
    }
    
    // Fallback: utiliser l'email sans le domaine
    if (user.email) {
      const emailPart = user.email.split('@')[0];
      // Remplacer les tirets et underscores par des espaces et capitaliser
      return emailPart
        .replace(/[-_.]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    return 'Utilisateur';
  };

  // Afficher le loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    );
  }

  // Afficher la page de connexion si non authentifié et pas en mode test
  if (!user && !testMode) {
    return <Login />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      {/* Header - Optimisé pour mobile */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Top row - Title, User Info and Logout */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                Monteiro - Gestion Heures
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">
                Système de gestion des employés et des horaires
              </p>
              {/* Date du jour - affichée sous le titre sur mobile */}
              <p className="text-xs text-gray-500 mt-1 md:hidden">
                {currentDate}
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 ml-2">
              {/* Date du jour */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs text-gray-500">{currentDate}</span>
              </div>
              
              {/* Séparateur vertical (desktop seulement) */}
              <div className="hidden md:block h-10 w-px bg-gray-300"></div>
              
              {/* Nom utilisateur */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {getUserDisplayName()}
                  </span>
                  {testMode && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      MODE TEST
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 hidden sm:block">
                  {user?.email || 'test@monteiro.com'}
                </span>
              </div>
              
              {/* Bouton déconnexion */}
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex-shrink-0"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Restaurant Switcher - Full width on mobile */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setRestaurant('MTL_NORD')}
              className={`flex-1 px-3 py-2.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                restaurant === 'MTL_NORD'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              MTL-Nord
            </button>
            <button
              onClick={() => setRestaurant('HENRI_BOURASSA')}
              className={`flex-1 px-3 py-2.5 sm:py-2 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                restaurant === 'HENRI_BOURASSA'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              H-Bourassa
            </button>
          </div>

          {/* Desktop Tabs - Hidden on mobile */}
          <div className="hidden md:flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('employees')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'employees'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Employés
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'schedule'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Emploi du temps
            </button>
            <button
              onClick={() => setActiveTab('payreport')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'payreport'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Rapport de paie
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Paramètres
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'employees' && <Employees restaurant={restaurant} />}
        {activeTab === 'schedule' && <Schedule restaurant={restaurant} />}
        {activeTab === 'payreport' && <PayReport restaurant={restaurant} />}
        {activeTab === 'settings' && <Settings restaurant={restaurant} />}
      </main>

      {/* Bottom Navigation - Mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'employees'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Employés</span>
          </button>
          
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'schedule'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-medium">Horaire</span>
          </button>
          
          <button
            onClick={() => setActiveTab('payreport')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'payreport'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs font-medium">Paie</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            <span className="text-xs font-medium">Paramètres</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
