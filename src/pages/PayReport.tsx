import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, FileText, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Props = {
  restaurant: 'MTL_NORD' | 'HENRI_BOURASSA';
};

type RestaurantBreakdown = {
  employee_id: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  adresse: string;
  restaurant: string;
  taux_horaire: number;
  est_principal: boolean;
  total_heures: number;
  total_salaire: number;
};

type PayReportData = {
  restaurant_breakdown: RestaurantBreakdown[];
  period: {
    start_date: string;
    end_date: string;
    restaurant_filter: string;
  };
  summary: {
    total_employees: number;
    total_heures_periode: number;
    total_salaire_periode: number;
  };
};

export function PayReport({ restaurant }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<PayReportData | null>(null);

  const getRestaurantName = (code: string) => {
    return code === 'MTL_NORD' ? 'Montréal-Nord' : 'Henri-Bourassa';
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert('Veuillez sélectionner les dates de début et de fin');
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        start_date: startDate,
        end_date: endDate,
        restaurant_filter: restaurant,
      };

      const { data, error } = await supabase.functions.invoke('generate-pay-report', {
        body: requestBody,
      });

      if (error) {
        console.error('Erreur lors de la génération:', error);
        alert('Erreur lors de la génération du rapport');
        return;
      }

      const reportResult = data?.data;
      setReportData(reportResult);

      if (!reportResult || reportResult.restaurant_breakdown.length === 0) {
        alert('Aucune donnée trouvée pour cette période');
      }
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData || reportData.restaurant_breakdown.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(16);
    const restaurantTitle = getRestaurantName(restaurant);
    doc.text(`Rapport de Paie - ${restaurantTitle}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Période: ${reportData.period.start_date} au ${reportData.period.end_date}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Employé', 'Taux horaire', 'Heures', 'Total']],
      body: reportData.restaurant_breakdown.map(emp => [
        `${emp.prenom} ${emp.nom}`,
        `${emp.taux_horaire.toFixed(2)} $`,
        emp.total_heures.toFixed(2),
        `${emp.total_salaire.toFixed(2)} $`,
      ]),
      foot: [[
        'TOTAL',
        '',
        reportData.summary.total_heures_periode.toFixed(2),
        `${reportData.summary.total_salaire_periode.toFixed(2)} $`,
      ]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    const filename = `Rapport_Paie_${restaurantTitle.replace('-', '_')}_${startDate}_${endDate}.pdf`;
    doc.save(filename);
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.restaurant_breakdown.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const headers = ['Nom', 'Prénom', 'Taux horaire', 'Nombre d\'heures', 'Total salaire'];
    const rows = reportData.restaurant_breakdown.map(emp => [
      emp.nom,
      emp.prenom,
      emp.taux_horaire.toFixed(2),
      emp.total_heures.toFixed(2),
      emp.total_salaire.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const restaurantTitle = getRestaurantName(restaurant);
    const filename = `Rapport_Paie_${restaurantTitle.replace('-', '_')}_${startDate}_${endDate}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const getTwoWeeksAgo = () => {
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);
    return twoWeeksAgo.toISOString().split('T')[0];
  };

  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
          Rapport de paie - {getRestaurantName(restaurant)}
        </h2>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Date inputs - Mobile optimized */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de début
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>
            </div>

            {/* Quick select button */}
            <button
              onClick={() => {
                setStartDate(getTwoWeeksAgo());
                setEndDate(getToday());
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base font-medium touch-manipulation"
            >
              <Calendar className="w-4 h-4" />
              Dernières 2 semaines
            </button>

            {/* Generate button */}
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full px-6 py-3 sm:py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-base sm:text-lg touch-manipulation"
            >
              {loading ? 'Génération en cours...' : 'Générer le rapport de paie'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && reportData.restaurant_breakdown.length > 0 && (
        <div>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Résultats du rapport
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base touch-manipulation"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base touch-manipulation"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">Résumé de la période</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Employés:</span>
                <div className="font-bold text-gray-900">{reportData.summary.total_employees}</div>
              </div>
              <div>
                <span className="text-gray-600">Heures totales:</span>
                <div className="font-bold text-blue-600">{reportData.summary.total_heures_periode.toFixed(2)}h</div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-gray-600">Salaire total:</span>
                <div className="font-bold text-green-600">{reportData.summary.total_salaire_periode.toFixed(2)} $</div>
              </div>
            </div>
          </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taux horaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Heures
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.restaurant_breakdown.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {emp.prenom} {emp.nom}
                      </div>
                      <div className="text-sm text-gray-500">{emp.adresse}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {emp.taux_horaire.toFixed(2)} $
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {emp.total_heures.toFixed(2)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {emp.total_salaire.toFixed(2)} $
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - Shown only on mobile */}
          <div className="md:hidden space-y-3">
            {reportData.restaurant_breakdown.map((emp) => (
              <div key={emp.employee_id} className="bg-white rounded-lg shadow-sm p-4">
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900">
                    {emp.prenom} {emp.nom}
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5">{emp.adresse}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Taux horaire:</span>
                    <div className="font-medium text-gray-900">{emp.taux_horaire.toFixed(2)} $</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Heures:</span>
                    <div className="font-bold text-blue-600">{emp.total_heures.toFixed(2)}h</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Total:</span>
                    <div className="font-bold text-green-600 text-lg">{emp.total_salaire.toFixed(2)} $</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
