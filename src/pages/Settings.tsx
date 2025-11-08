import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Calendar, Check } from 'lucide-react';

type Props = {
  restaurant: 'MTL_NORD' | 'HENRI_BOURASSA';
};

type WeekStartDay = 'monday' | 'sunday' | 'saturday';

type RestaurantSettings = {
  id: string;
  restaurant_name: string;
  week_start_day: WeekStartDay;
};

export function Settings({ restaurant }: Props) {
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>('sunday');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getRestaurantName = () => {
    return restaurant === 'MTL_NORD' ? 'Montréal-Nord' : 'Henri-Bourassa';
  };

  const getDayLabel = (day: WeekStartDay): string => {
    switch (day) {
      case 'monday':
        return 'Lundi';
      case 'sunday':
        return 'Dimanche';
      case 'saturday':
        return 'Samedi';
      default:
        return '';
    }
  };

  const getDayDescription = (day: WeekStartDay): string => {
    switch (day) {
      case 'monday':
        return 'Recommandé au Québec - Semaine du lundi au dimanche';
      case 'sunday':
        return 'Par défaut - Semaine du dimanche au samedi';
      case 'saturday':
        return 'Semaine du samedi au vendredi';
      default:
        return '';
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [restaurant]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('restaurant_name', restaurant)
        .single();

      if (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        return;
      }

      if (data) {
        setWeekStartDay(data.week_start_day);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ 
          week_start_day: weekStartDay,
          updated_at: new Date().toISOString()
        })
        .eq('restaurant_name', restaurant);

      if (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde des paramètres');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Chargement des paramètres...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
          Paramètres - {getRestaurantName()}
        </h2>
        <p className="text-sm text-gray-600">
          Configurez les préférences d'affichage pour ce restaurant
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configuration de la semaine
            </h3>
            <p className="text-sm text-gray-600">
              Définissez le jour de début de semaine pour l'emploi du temps
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jour de début de semaine
            </label>
            <select
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value as WeekStartDay)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            >
              <option value="monday">Lundi (recommandé au Québec)</option>
              <option value="sunday">Dimanche (par défaut actuel)</option>
              <option value="saturday">Samedi</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              À propos de cette option
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                <strong>{getDayLabel(weekStartDay)}</strong> : {getDayDescription(weekStartDay)}
              </p>
              <p className="text-blue-700">
                Cette modification affecte uniquement l'affichage de l'emploi du temps. 
                Les données existantes ne sont pas modifiées.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Paramètres enregistrés
                </>
              ) : (
                <>
                  <SettingsIcon className="w-5 h-5" />
                  {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </>
              )}
            </button>
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Les paramètres ont été enregistrés avec succès. Actualisez l'emploi du temps pour voir les changements.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Exemples d'affichage selon le jour de début
        </h4>
        <div className="space-y-2 text-sm text-gray-700">
          <div>
            <strong>Lundi :</strong> <span className="font-mono text-xs">Lun | Mar | Mer | Jeu | Ven | Sam | Dim</span>
          </div>
          <div>
            <strong>Dimanche :</strong> <span className="font-mono text-xs">Dim | Lun | Mar | Mer | Jeu | Ven | Sam</span>
          </div>
          <div>
            <strong>Samedi :</strong> <span className="font-mono text-xs">Sam | Dim | Lun | Mar | Mer | Jeu | Ven</span>
          </div>
        </div>
      </div>
    </div>
  );
}
