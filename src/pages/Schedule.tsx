import { useState, useEffect } from 'react';
import { supabase, type EmployeeWithRestaurants, type Shift } from '../lib/supabase';
import { ChevronLeft, ChevronRight, X, Star, MapPin, Edit2, Check, Copy, Trash2 } from 'lucide-react';

type Props = {
  restaurant: 'MTL_NORD' | 'HENRI_BOURASSA';
};

type WeekStartDay = 'monday' | 'sunday' | 'saturday';

type ShiftCell = {
  date: string;
  shiftType: 'AM' | 'PM';
  employees: Array<{ 
    id: string; 
    name: string; 
    shiftId: string; 
    hours: number; 
    isMultiRestaurant: boolean; 
    isPrincipal: boolean;
    color: string;
  }>;
};

export function Schedule({ restaurant }: Props) {
  const [employees, setEmployees] = useState<EmployeeWithRestaurants[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>('sunday');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [selectedCell, setSelectedCell] = useState<{ date: string; shiftType: 'AM' | 'PM' } | null>(null);
  const [customHours, setCustomHours] = useState<string>('7.0');
  const [loading, setLoading] = useState(true);
  const [editingShift, setEditingShift] = useState<{ shiftId: string; hours: string } | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ shiftId: string; employeeName: string } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [targetWeekStart, setTargetWeekStart] = useState<string>('');
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateConflict, setDuplicateConflict] = useState<boolean>(false);
  const [showDeleteWeekModal, setShowDeleteWeekModal] = useState(false);
  const [deletingWeek, setDeletingWeek] = useState(false);


  // Jours de base (ordre dimanche = 0)
  const baseDaysShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const baseDaysFull = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // Réorganiser les jours selon week_start_day
  const getOrderedDays = () => {
    let startIndex = 0;
    if (weekStartDay === 'monday') startIndex = 1;
    else if (weekStartDay === 'saturday') startIndex = 6;
    
    const orderedShort = [...baseDaysShort.slice(startIndex), ...baseDaysShort.slice(0, startIndex)];
    const orderedFull = [...baseDaysFull.slice(startIndex), ...baseDaysFull.slice(0, startIndex)];
    
    return { short: orderedShort, full: orderedFull };
  };

  const { short: weekDays, full: weekDaysFull } = getOrderedDays();

  useEffect(() => {
    fetchSettings();
  }, [restaurant]);

  useEffect(() => {
    if (weekStartDay) {
      setCurrentWeekStart(getStartOfWeek(new Date(), weekStartDay));
    }
  }, [weekStartDay]);

  useEffect(() => {
    fetchData();
  }, [restaurant, currentWeekStart]);

  useEffect(() => {
    if (targetWeekStart) {
      checkForConflicts();
    }
  }, [targetWeekStart]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('week_start_day')
        .eq('restaurant_name', restaurant)
        .single();

      if (error) {
        console.error('Erreur chargement paramètres:', error);
        return;
      }

      if (data) {
        setWeekStartDay(data.week_start_day as WeekStartDay);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  function getStartOfWeek(date: Date, startDay: WeekStartDay = 'sunday'): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
    
    let targetDay = 0; // dimanche par défaut
    if (startDay === 'monday') targetDay = 1;
    else if (startDay === 'saturday') targetDay = 6;
    
    // Calculer la différence de jours
    let diff = day - targetDay;
    if (diff < 0) diff += 7;
    
    const result = new Date(d);
    result.setDate(d.getDate() - diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  // Fonction combinée pour récupérer les données
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchEmployees(), fetchShifts()]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Récupérer tous les employés
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .order('nom', { ascending: true });

      if (employeesError) {
        console.error('Erreur lors du chargement des employés:', employeesError);
        return;
      }

      // Récupérer les assignations de restaurants
      const { data: restaurantAssignments, error: assignmentsError } = await supabase
        .from('employee_restaurants')
        .select('*');

      if (assignmentsError) {
        console.error('Erreur lors du chargement des assignations:', assignmentsError);
        return;
      }

      // Combiner les données et filtrer pour le restaurant sélectionné
      const employeesWithRestaurants: EmployeeWithRestaurants[] = (employeesData || [])
        .map(emp => ({
          ...emp,
          restaurants: (restaurantAssignments || []).filter(assignment => assignment.employee_id === emp.id),
        }))
        .filter(emp => emp.restaurants.some(r => r.restaurant === restaurant));

      setEmployees(employeesWithRestaurants);
    } catch (error) {
      console.error('Erreur lors de la récupération des employés:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const startDate = formatDate(currentWeekStart);
      const endDate = formatDate(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000));

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('restaurant', restaurant)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('Erreur lors du chargement des shifts:', error);
        return;
      }

      setShifts(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des shifts:', error);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getWeekDates = (): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(currentWeekStart.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return dates;
  };

  const getShiftCell = (date: Date, shiftType: 'AM' | 'PM'): ShiftCell => {
    const dateStr = formatDate(date);
    const cellShifts = shifts.filter(s => s.date === dateStr && s.shift_type === shiftType);

    return {
      date: dateStr,
      shiftType,
      employees: cellShifts.map(s => {
        const emp = employees.find(e => e.id === s.employee_id);
        const currentRestaurantData = emp?.restaurants.find(r => r.restaurant === restaurant);
        
        return {
          id: s.employee_id,
          name: emp ? `${emp.prenom} ${emp.nom}` : 'Employé introuvable',
          shiftId: s.id,
          hours: s.heures_travaillees,
          isMultiRestaurant: emp ? emp.restaurants.length > 1 : false,
          isPrincipal: currentRestaurantData ? currentRestaurantData.est_principal : false,
          color: emp?.color || '#3B82F6',
        };
      }),
    };
  };

  const handleCellClick = (date: string, shiftType: 'AM' | 'PM') => {
    setSelectedCell({ date, shiftType });
    setCustomHours('7.0');
    setValidationError(''); // Réinitialiser l'erreur
  };

  const handleAddEmployee = async (employeeId: string) => {
    if (!selectedCell) return;

    const hours = parseFloat(customHours);
    
    // Réinitialiser l'erreur
    setValidationError('');
    
    // Validation
    if (isNaN(hours)) {
      setValidationError('Veuillez saisir un nombre valide');
      return;
    }
    
    if (hours < 0) {
      setValidationError('Les heures ne peuvent pas être négatives');
      return;
    }
    
    if (hours > 12) {
      setValidationError('Les heures ne peuvent pas dépasser 12h par shift');
      return;
    }

    const { error } = await supabase
      .from('shifts')
      .insert([{
        employee_id: employeeId,
        date: selectedCell.date,
        shift_type: selectedCell.shiftType,
        start_time: selectedCell.shiftType === 'AM' ? '10:00' : '17:00',
        end_time: selectedCell.shiftType === 'AM' ? '17:00' : '00:00',
        heures_travaillees: hours,
        restaurant,
      }]);

    if (error) {
      console.error('Erreur lors de l\'ajout du shift:', error);
      setValidationError('Erreur lors de l\'ajout du shift');
    } else {
      await fetchShifts();
      setSelectedCell(null);
      setValidationError('');
    }
  };

  const handleRemoveShift = (shiftId: string, employeeName: string) => {
    setDeleteConfirmation({ shiftId, employeeName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', deleteConfirmation.shiftId);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du shift: ' + error.message);
        return;
      }

      await fetchShifts();
      
    } catch (err) {
      console.error('Exception lors de la suppression:', err);
      alert('Erreur inattendue lors de la suppression');
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const handleEditHours = (shiftId: string, currentHours: number) => {
    setEditingShift({ shiftId, hours: currentHours.toString() });
  };

  const handleSaveHours = async () => {
    if (!editingShift) return;

    const hours = parseFloat(editingShift.hours);
    
    // Validation stricte
    if (isNaN(hours)) {
      // Ne pas sauvegarder, garder le mode édition
      return;
    }
    
    if (hours < 0 || hours > 12) {
      // Ne pas sauvegarder, garder le mode édition
      return;
    }

    const { error } = await supabase
      .from('shifts')
      .update({ heures_travaillees: hours })
      .eq('id', editingShift.shiftId);

    if (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } else {
      await fetchShifts();
      setEditingShift(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingShift(null);
  };

  // Fonction pour ouvrir le modal de duplication
  const handleDuplicateWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(currentWeekStart.getDate() + 7);
    setTargetWeekStart(formatDate(nextWeek));
    setShowDuplicateModal(true);
    setDuplicateConflict(false);
  };

  // Fonction pour vérifier les conflits
  const checkForConflicts = async () => {
    if (!targetWeekStart) return;
    
    const targetEndDate = new Date(targetWeekStart);
    targetEndDate.setDate(targetEndDate.getDate() + 6);
    
    const { data: existingShifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('restaurant', restaurant)
      .gte('date', targetWeekStart)
      .lte('date', formatDate(targetEndDate));

    setDuplicateConflict((existingShifts?.length || 0) > 0);
  };

  // Fonction pour dupliquer la semaine (duplication à 100% avec suppression préalable)
  const handleConfirmDuplicate = async () => {
    if (!targetWeekStart) return;
    
    setDuplicating(true);
    try {
      // Calculer les dates de destination
      const sourceStart = new Date(currentWeekStart);
      const targetStart = new Date(targetWeekStart);
      const targetEndDate = new Date(targetStart);
      targetEndDate.setDate(targetStart.getDate() + 6);

      // Récupérer tous les shifts de la semaine source
      const sourceStartDate = formatDate(sourceStart);
      const sourceEndDate = formatDate(new Date(sourceStart.getTime() + 6 * 24 * 60 * 60 * 1000));
      
      const { data: sourceShifts, error: fetchError } = await supabase
        .from('shifts')
        .select('*')
        .eq('restaurant', restaurant)
        .gte('date', sourceStartDate)
        .lte('date', sourceEndDate);

      if (fetchError) {
        console.error('Erreur lors de la récupération des shifts:', fetchError);
        alert('Erreur lors de la récupération des shifts à dupliquer');
        return;
      }

      if (!sourceShifts || sourceShifts.length === 0) {
        alert('Aucun shift à dupliquer pour cette semaine');
        setShowDuplicateModal(false);
        return;
      }

      // ÉTAPE 1: Supprimer tous les shifts existants de la semaine de destination
      const targetStartDate = formatDate(targetStart);
      const targetEndDateStr = formatDate(targetEndDate);

      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .eq('restaurant', restaurant)
        .gte('date', targetStartDate)
        .lte('date', targetEndDateStr);

      if (deleteError) {
        console.error('Erreur lors de la suppression:', deleteError);
        alert('Erreur lors de la suppression des shifts existants');
        return;
      }

      // ÉTAPE 2: Créer les nouveaux shifts pour la semaine de destination
      const newShifts = sourceShifts.map(shift => {
        const sourceDate = new Date(shift.date);
        const dayOfWeek = sourceDate.getDay(); // 0 = dimanche, 1 = lundi, etc.
        const targetDate = new Date(targetStart);
        
        // Ajuster pour la semaine de destination
        if (dayOfWeek === 0) targetDate.setDate(targetStart.getDate()); // Dimanche
        else if (dayOfWeek === 1) targetDate.setDate(targetStart.getDate() + 1); // Lundi
        else if (dayOfWeek === 2) targetDate.setDate(targetStart.getDate() + 2); // Mardi
        else if (dayOfWeek === 3) targetDate.setDate(targetStart.getDate() + 3); // Mercredi
        else if (dayOfWeek === 4) targetDate.setDate(targetStart.getDate() + 4); // Jeudi
        else if (dayOfWeek === 5) targetDate.setDate(targetStart.getDate() + 5); // Vendredi
        else if (dayOfWeek === 6) targetDate.setDate(targetStart.getDate() + 6); // Samedi

        return {
          employee_id: shift.employee_id,
          date: formatDate(targetDate),
          shift_type: shift.shift_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          heures_travaillees: shift.heures_travaillees,
          restaurant: shift.restaurant,
        };
      });

      // ÉTAPE 3: Insérer les nouveaux shifts
      const { error: insertError } = await supabase
        .from('shifts')
        .insert(newShifts);

      if (insertError) {
        console.error('Erreur lors de l\'insertion:', insertError);
        alert('Erreur lors de la duplication: ' + insertError.message);
        return;
      }

      alert(`${sourceShifts.length} shift(s) dupliqué(s) à 100% avec succès ! (La semaine de destination a été complètement remplacée)`);
      setShowDuplicateModal(false);
      await fetchShifts();

    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      alert('Erreur inattendue lors de la duplication');
    } finally {
      setDuplicating(false);
    }
  };

  // Fonction pour ouvrir le modal de suppression de semaine
  const handleDeleteWeek = () => {
    setShowDeleteWeekModal(true);
  };

  // Fonction pour confirmer la suppression de la semaine
  const handleConfirmDeleteWeek = async () => {
    setDeletingWeek(true);
    try {
      // Calculer les dates de la semaine
      const weekStart = currentWeekStart;
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 6);
      
      const startDate = formatDate(weekStart);
      const endDate = formatDate(weekEnd);

      // Supprimer tous les shifts de cette semaine
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('restaurant', restaurant)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression des shifts: ' + error.message);
        return;
      }

      const deletedCount = shifts.filter(s => s.date >= startDate && s.date <= endDate).length;
      alert(`${deletedCount} shift(s) supprimé(s) avec succès !`);
      setShowDeleteWeekModal(false);
      await fetchShifts();

    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur inattendue lors de la suppression');
    } finally {
      setDeletingWeek(false);
    }
  };

  // Fonction pour obtenir une couleur de texte contrastée
  const getContrastColor = (hexColor: string): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? '#000000' : '#FFFFFF';
  };

  const changeWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentWeekStart(newDate);
  };

  const getWeekRangeText = (): string => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);
    
    const formatOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const startStr = currentWeekStart.toLocaleDateString('fr-FR', formatOptions);
    const endStr = endDate.toLocaleDateString('fr-FR', formatOptions);
    
    return `Semaine du ${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Chargement de l'emploi du temps...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Emploi du temps - {restaurant === 'MTL_NORD' ? 'Montréal Nord' : 'Henri-Bourassa'}
        </h2>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 sm:p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
            {getWeekRangeText()}
          </span>
          <button
            onClick={() => changeWeek(1)}
            className="p-2 sm:p-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors touch-manipulation"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleDuplicateWeek}
            className="p-2 sm:p-2.5 rounded-lg border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 transition-colors touch-manipulation"
            title="Dupliquer cette semaine vers une autre"
          >
            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleDeleteWeek}
            className="p-2 sm:p-2.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 transition-colors touch-manipulation"
            title="Supprimer tous les shifts de cette semaine"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Information si aucun employé */}
      {employees.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="text-yellow-800">
            <strong>Aucun employé assigné à ce restaurant.</strong><br />
            Utilisez la page "Employés" pour assigner des employés au restaurant {restaurant === 'MTL_NORD' ? 'Montréal Nord' : 'Henri-Bourassa'}.
          </div>
        </div>
      )}

      {/* Légende des couleurs */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Légende des employés</h3>
          <div className="flex flex-wrap gap-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-sm"
                style={{ 
                  backgroundColor: emp.color,
                  color: getContrastColor(emp.color)
                }}
              >
                <span className="text-xs sm:text-sm font-medium">
                  {emp.prenom} {emp.nom}
                </span>
                {emp.restaurants.find(r => r.restaurant === restaurant)?.est_principal && (
                  <span title="Restaurant principal">
                    <Star className="w-3 h-3" />
                  </span>
                )}
                {emp.restaurants.length > 1 && (
                  <span title="Multi-restaurants">
                    <MapPin className="w-3 h-3" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Table - Optimized for mobile with horizontal scroll */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-3 sm:px-0">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                    Jour
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    <div className="hidden sm:block">10 AM - 5 PM</div>
                    <div className="sm:hidden">AM</div>
                  </th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                    <div className="hidden sm:block">5 PM - Minuit</div>
                    <div className="sm:hidden">PM</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {getWeekDates().map((date, index) => {
                  const amCell = getShiftCell(date, 'AM');
                  const pmCell = getShiftCell(date, 'PM');

                  return (
                    <tr key={formatDate(date)} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-3 sm:py-3 whitespace-nowrap sticky left-0 bg-white">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          <span className="hidden sm:inline">{weekDaysFull[index]}</span>
                          <span className="sm:hidden">{weekDays[index]}</span>
                        </div>
                        <div className="text-xs text-gray-500 leading-tight">{formatDate(date).slice(5)}</div>
                      </td>

                      {/* AM Shift */}
                      <td
                        onClick={() => !editingShift && handleCellClick(amCell.date, 'AM')}
                        className="px-2 sm:px-4 py-2 sm:py-3 cursor-pointer hover:bg-blue-50 transition-colors touch-manipulation min-w-[180px] sm:min-w-0"
                      >
                        <div className="space-y-1">
                          {amCell.employees.map((emp) => (
                            <div
                              key={emp.shiftId}
                              className="flex items-center justify-between px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm shadow-sm"
                              style={{ 
                                backgroundColor: emp.color,
                                color: getContrastColor(emp.color)
                              }}
                            >
                              {editingShift?.shiftId === emp.shiftId ? (
                                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="12"
                                    value={editingShift.hours}
                                    onChange={(e) => setEditingShift({ ...editingShift, hours: e.target.value })}
                                    className="w-16 px-1 py-0.5 rounded text-xs text-gray-900 border border-gray-300"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveHours}
                                    className="p-0.5 hover:opacity-80"
                                    title="Sauvegarder"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-0.5 hover:opacity-80"
                                    title="Annuler"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className="font-medium break-words">
                                      {emp.name} ({emp.hours}h)
                                    </span>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      {emp.isPrincipal && (
                                        <span title="Restaurant principal">
                                          <Star className="w-3 h-3" />
                                        </span>
                                      )}
                                      {emp.isMultiRestaurant && (
                                        <span title="Multi-restaurants">
                                          <MapPin className="w-3 h-3" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditHours(emp.shiftId, emp.hours);
                                      }}
                                      className="p-0.5 hover:opacity-80"
                                      title="Modifier les heures"
                                    >
                                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveShift(emp.shiftId, emp.name);
                                      }}
                                      className="p-0.5 hover:opacity-80"
                                      title="Supprimer"
                                    >
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {amCell.employees.length === 0 && (
                            <div className="text-xs text-gray-400 py-1">Ajouter</div>
                          )}
                        </div>
                      </td>

                      {/* PM Shift */}
                      <td
                        onClick={() => !editingShift && handleCellClick(pmCell.date, 'PM')}
                        className="px-2 sm:px-4 py-2 sm:py-3 cursor-pointer hover:bg-blue-50 transition-colors touch-manipulation min-w-[180px] sm:min-w-0"
                      >
                        <div className="space-y-1">
                          {pmCell.employees.map((emp) => (
                            <div
                              key={emp.shiftId}
                              className="flex items-center justify-between px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm shadow-sm"
                              style={{ 
                                backgroundColor: emp.color,
                                color: getContrastColor(emp.color)
                              }}
                            >
                              {editingShift?.shiftId === emp.shiftId ? (
                                <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="12"
                                    value={editingShift.hours}
                                    onChange={(e) => setEditingShift({ ...editingShift, hours: e.target.value })}
                                    className="w-16 px-1 py-0.5 rounded text-xs text-gray-900 border border-gray-300"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveHours}
                                    className="p-0.5 hover:opacity-80"
                                    title="Sauvegarder"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-0.5 hover:opacity-80"
                                    title="Annuler"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1 flex-1 min-w-0">
                                    <span className="font-medium break-words">
                                      {emp.name} ({emp.hours}h)
                                    </span>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      {emp.isPrincipal && (
                                        <span title="Restaurant principal">
                                          <Star className="w-3 h-3" />
                                        </span>
                                      )}
                                      {emp.isMultiRestaurant && (
                                        <span title="Multi-restaurants">
                                          <MapPin className="w-3 h-3" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditHours(emp.shiftId, emp.hours);
                                      }}
                                      className="p-0.5 hover:opacity-80"
                                      title="Modifier les heures"
                                    >
                                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveShift(emp.shiftId, emp.name);
                                      }}
                                      className="p-0.5 hover:opacity-80"
                                      title="Supprimer"
                                    >
                                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          {pmCell.employees.length === 0 && (
                            <div className="text-xs text-gray-400 py-1">Ajouter</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Information si aucun shift */}
      {shifts.length === 0 && employees.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800">
            <strong>Aucun shift programmé cette semaine pour ce restaurant.</strong><br />
            Cliquez sur une cellule du tableau pour ajouter un shift à un employé.
          </div>
        </div>
      )}

      {/* Employee Selection Modal - Mobile optimized */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-md sm:mx-4 max-h-[80vh] sm:max-h-[70vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-semibold">
                  Ajouter un employé
                </h3>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {selectedCell.date} - {selectedCell.shiftType === 'AM' ? 'Matin (10h-17h)' : 'Soir (17h-00h)'}
              </p>
            </div>

            <div className="p-4 sm:p-6 flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre d'heures
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="12"
                value={customHours}
                onChange={(e) => {
                  setCustomHours(e.target.value);
                  setValidationError(''); // Réinitialiser l'erreur lors de la saisie
                }}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              {validationError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {validationError}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-2">
                {employees.map((emp) => {
                  const currentRestaurantData = emp.restaurants.find(r => r.restaurant === restaurant);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => handleAddEmployee(emp.id)}
                      className="w-full text-left px-4 py-3 border-2 rounded-lg hover:shadow-md transition-all text-sm sm:text-base touch-manipulation"
                      style={{
                        borderColor: emp.color,
                        backgroundColor: `${emp.color}15`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: emp.color }}
                          />
                          <span className="font-medium">
                            {emp.prenom} {emp.nom}
                          </span>
                          <div className="flex items-center gap-1">
                            {currentRestaurantData?.est_principal && (
                              <span title="Restaurant principal">
                                <Star className="w-3 h-3 text-blue-600" />
                              </span>
                            )}
                            {emp.restaurants.length > 1 && (
                              <span title="Multi-restaurants">
                                <MapPin className="w-3 h-3 text-green-600" />
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {currentRestaurantData?.taux_horaire.toFixed(2)} $/h
                        </span>
                      </div>
                      {emp.restaurants.length > 1 && (
                        <div className="mt-1 text-xs text-gray-500">
                          Travaille aussi à: {emp.restaurants.filter(r => r.restaurant !== restaurant).map(r => r.restaurant === 'MTL_NORD' ? 'MTL' : 'HB').join(', ')}
                        </div>
                      )}
                    </button>
                  );
                })}
                {employees.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun employé assigné à ce restaurant.
                    <br />
                    Utilisez la page "Employés" pour en assigner.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-lg font-semibold mb-4 text-gray-900">
              Êtes-vous sûr de vouloir supprimer l'employé {deleteConfirmation.employeeName} ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                Non
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de duplication de semaine */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Dupliquer l'emploi du temps
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Cette action duplique tous les shifts de la semaine actuelle vers une autre semaine.
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semaine de destination (date du lundi)
              </label>
              <input
                type="date"
                value={targetWeekStart}
                onChange={(e) => setTargetWeekStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                🔄 Duplication à 100% : Cette action supprimera d'abord tous les shifts existants 
                de la semaine de destination, puis copiera la semaine actuelle à l'identique.
              </p>
            </div>

            {duplicating && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Duplication en cours...
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDuplicateModal(false)}
                disabled={duplicating}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDuplicate}
                disabled={duplicating || !targetWeekStart}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {duplicating ? 'Duplication...' : 'Dupliquer à 100%'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression de semaine */}
      {showDeleteWeekModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Supprimer la semaine
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Cette action supprime définitivement tous les shifts de la semaine en cours.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  ⚠️ Attention : Cette action est irréversible !
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {getWeekRangeText()} - {shifts.filter(s => {
                    const shiftDate = new Date(s.date);
                    return shiftDate >= currentWeekStart && 
                           shiftDate <= new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                  }).length} shift(s) seront supprimé(s).
                </p>
              </div>
            </div>

            {deletingWeek && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Suppression en cours...
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteWeekModal(false)}
                disabled={deletingWeek}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDeleteWeek}
                disabled={deletingWeek}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingWeek ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}