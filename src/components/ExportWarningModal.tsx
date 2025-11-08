import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  exportType: 'PDF' | 'CSV';
  employeeCount: number;
  reportPeriod: string;
};

export function ExportWarningModal({ isOpen, onClose, onConfirm, exportType, employeeCount, reportPeriod }: Props) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Valider la saisie
    if (confirmText.toUpperCase() !== 'EXPORTER') {
      alert('Veuillez taper "EXPORTER" pour continuer');
      return;
    }

    if (reason.trim().length < 15) {
      alert('Le motif doit contenir au moins 15 caractères');
      return;
    }

    setLoading(true);

    try {
      // Logger l'export de rapport (utiliser l'ID utilisateur pour les exports globaux)
      const logEntry = {
        employee_id: user?.id, // Utiliser l'ID de l'utilisateur au lieu d'un ID fictif d'employé
        accessed_by: user?.id,
        reason: `Export ${exportType} - Rapport de paie (${reportPeriod}) - ${employeeCount} employés - Motif: ${reason.trim()}`,
        user_email: user?.email,
      };

      const { error: logError } = await supabase
        .from('nas_access_log')
        .insert([logEntry]);

      if (logError) {
        console.error('Erreur lors de la journalisation:', logError);
        // Ne pas bloquer l'export si le log échoue
        console.warn('L\'export continuera malgré l\'échec du logging');
      }

      // Procéder à l'export
      onConfirm();
      handleClose();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue lors de la journalisation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Avertissement - Export de données sensibles
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avertissements PIPEDA */}
        <div className="mb-4 space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Données personnelles protégées
            </h4>
            <p className="text-sm text-red-800 mb-2">
              Ce rapport contient des <strong>Numéros d'Assurance Sociale (NAS)</strong> et 
              d'autres informations personnelles protégées par:
            </p>
            <ul className="text-sm text-red-800 ml-4 space-y-1 list-disc">
              <li>Loi sur la protection des renseignements personnels et les documents électroniques (PIPEDA)</li>
              <li>Loi sur la protection des renseignements personnels du Québec</li>
            </ul>
          </div>
          
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">Responsabilités légales</h4>
            <ul className="text-sm text-yellow-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>Vous êtes responsable de la sécurité et de la confidentialité de ce document</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>Le partage non autorisé est passible de sanctions légales et disciplinaires</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>Conservez ce fichier dans un emplacement sécurisé et chiffré</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">•</span>
                <span>Supprimez le fichier lorsqu'il n'est plus nécessaire</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Détails de l'export:</strong><br />
              Type: {exportType} • {employeeCount} employé{employeeCount > 1 ? 's' : ''} • Période: {reportPeriod}
            </p>
          </div>
        </div>

        {/* Motif d'export */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motif de l'export <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Préparation des T4 pour l'année fiscale 2024 - Envoi au comptable"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            rows={3}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Minimum 15 caractères - Cet export sera journalisé avec votre identité
          </p>
        </div>

        {/* Confirmation */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tapez "EXPORTER" pour confirmer <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="EXPORTER"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm uppercase"
            required
          />
        </div>

        {/* Engagement */}
        <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-700 leading-relaxed">
            En procédant à cet export, vous confirmez comprendre vos obligations légales et 
            vous engagez à protéger la confidentialité des données personnelles contenues dans ce document.
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Traitement...' : `Confirmer l'export ${exportType}`}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            Annuler
          </button>
        </div>

        <p className="mt-3 text-xs text-center text-gray-500">
          Export journalisé le {new Date().toLocaleString('fr-CA')} par {user?.email}
        </p>
      </div>
    </div>
  );
}
