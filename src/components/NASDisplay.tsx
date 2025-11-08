import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

type Props = {
  nas: string;
  employeeId: string;
  employeeName: string;
  className?: string;
};

export function NASDisplay({ nas, employeeId, employeeName, className = '' }: Props) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoHideTimeout, setAutoHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-masquage après 30 secondes
  useEffect(() => {
    if (isVisible) {
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 30000);
      setAutoHideTimeout(timeout);

      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [isVisible]);

  // Nettoyer le timeout lors du démontage
  useEffect(() => {
    return () => {
      if (autoHideTimeout) clearTimeout(autoHideTimeout);
    };
  }, [autoHideTimeout]);

  const handleShowNAS = () => {
    setShowModal(true);
  };

  const handleConfirm = async () => {
    // Valider la saisie
    if (confirmText.toUpperCase() !== 'CONFIRMER') {
      alert('Veuillez taper "CONFIRMER" pour continuer');
      return;
    }

    if (reason.trim().length < 10) {
      alert('Le motif doit contenir au moins 10 caractères');
      return;
    }

    setLoading(true);

    try {
      // Logger l'accès au NAS
      const { error: logError } = await supabase
        .from('nas_access_log')
        .insert([{
          employee_id: employeeId,
          accessed_by: user?.id,
          reason: reason.trim(),
          user_email: user?.email,
        }]);

      if (logError) {
        console.error('Erreur lors de la journalisation:', logError);
        alert('Erreur lors de la journalisation de l\'accès');
        return;
      }

      // Afficher le NAS
      setIsVisible(true);
      setShowModal(false);
      setReason('');
      setConfirmText('');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleHide = () => {
    setIsVisible(false);
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
      setAutoHideTimeout(null);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setReason('');
    setConfirmText('');
  };

  // Masquer le NAS (9 points de suspension)
  const maskedNAS = '•••-•••-•••';

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-gray-900 font-medium font-mono">
          {isVisible ? nas : maskedNAS}
        </span>
        <button
          onClick={isVisible ? handleHide : handleShowNAS}
          className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
          title={isVisible ? "Masquer le NAS" : "Afficher le NAS"}
        >
          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Bannière d'avertissement si NAS visible */}
      {isVisible && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>Données sensibles visibles - Auto-masquage dans 30s</span>
        </div>
      )}

      {/* Modal de confirmation */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Accès aux données sensibles
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avertissements PIPEDA */}
            <div className="mb-4 space-y-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                <p className="font-medium mb-1">Protection des données personnelles</p>
                <p className="text-xs">
                  Ces informations sont protégées par la Loi sur la protection des 
                  renseignements personnels et les documents électroniques (PIPEDA).
                </p>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <p className="font-medium mb-1">Responsabilité légale</p>
                <p className="text-xs">
                  L'accès non autorisé ou la divulgation de ces informations est 
                  passible de sanctions légales. Vous êtes responsable de la 
                  confidentialité de ces données.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                Vous êtes sur le point d'accéder au NAS de <strong>{employeeName}</strong>.
              </p>
            </div>

            {/* Motif d'accès */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif d'accès <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Préparation du rapport de paie mensuel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={3}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 10 caractères - Cet accès sera journalisé
              </p>
            </div>

            {/* Confirmation */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tapez "CONFIRMER" pour continuer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFIRMER"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm uppercase"
                required
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Traitement...' : 'Confirmer l\'accès'}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Annuler
              </button>
            </div>

            <p className="mt-3 text-xs text-center text-gray-500">
              Cet accès sera enregistré avec votre email et l'horodatage
            </p>
          </div>
        </div>
      )}
    </>
  );
}
