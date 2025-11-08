import { useState, useEffect } from 'react';
import { supabase, type Employee, type EmployeeRestaurant, type EmployeeWithRestaurants } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, MapPin, Star } from 'lucide-react';
import { NASDisplay } from '../components/NASDisplay';

type Props = {
  restaurant: 'MTL_NORD' | 'HENRI_BOURASSA';
};

export function Employees({ restaurant }: Props) {
  const [employees, setEmployees] = useState<EmployeeWithRestaurants[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithRestaurants | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ employeeId: string; employeeName: string } | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    nas: '',
    adresse: '',
    taux_horaire_principal: '',
    color: '#3B82F6',
    restaurants: {
      MTL_NORD: { selected: false, taux_horaire: '', est_principal: false },
      HENRI_BOURASSA: { selected: false, taux_horaire: '', est_principal: false },
    },
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    
    // Essayer de récupérer les employés actifs uniquement
    let { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_active', true)
      .order('nom', { ascending: true });

    // Si erreur 42703 (colonne inexistante), récupérer tous les employés sans filtre
    if (employeesError && employeesError.code === '42703') {
      console.log('Colonne is_active non trouvée, récupération de tous les employés...');
      const result = await supabase
        .from('employees')
        .select('*')
        .order('nom', { ascending: true });
      
      employeesData = result.data;
      employeesError = result.error;
    }

    if (employeesError) {
      console.error('Erreur lors du chargement des employés:', employeesError);
      setLoading(false);
      return;
    }

    // Récupérer les assignations de restaurants
    const { data: restaurantAssignments, error: assignmentsError } = await supabase
      .from('employee_restaurants')
      .select('*');

    if (assignmentsError) {
      console.error('Erreur lors du chargement des assignations:', assignmentsError);
      setLoading(false);
      return;
    }

    // Combiner les données
    const employeesWithRestaurants: EmployeeWithRestaurants[] = (employeesData || []).map(emp => ({
      ...emp,
      restaurants: (restaurantAssignments || []).filter(assignment => assignment.employee_id === emp.id),
    }));

    setEmployees(employeesWithRestaurants);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation : au moins un restaurant doit être sélectionné
    const selectedRestaurants = Object.entries(formData.restaurants)
      .filter(([_, data]) => data.selected);

    if (selectedRestaurants.length === 0) {
      alert('Veuillez sélectionner au moins un restaurant.');
      return;
    }

    // Validation : exactement un restaurant principal
    const principalRestaurants = selectedRestaurants.filter(([_, data]) => data.est_principal);
    if (principalRestaurants.length !== 1) {
      alert('Veuillez sélectionner exactement un restaurant principal.');
      return;
    }

    try {
      const employeeData = {
        nom: formData.nom,
        prenom: formData.prenom,
        date_naissance: formData.date_naissance,
        nas: formData.nas,
        adresse: formData.adresse,
        taux_horaire_principal: parseFloat(formData.taux_horaire_principal),
        color: formData.color,
      };

      let employeeId: string;

      if (editingEmployee) {
        // Mise à jour de l'employé existant
        const { error: updateError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (updateError) throw updateError;
        employeeId = editingEmployee.id;

        // Supprimer les anciennes assignations
        const { error: deleteError } = await supabase
          .from('employee_restaurants')
          .delete()
          .eq('employee_id', employeeId);

        if (deleteError) throw deleteError;
      } else {
        // Création d'un nouvel employé
        const { data: newEmployee, error: insertError } = await supabase
          .from('employees')
          .insert([employeeData])
          .select('id')
          .single();

        if (insertError) throw insertError;
        employeeId = newEmployee.id;
      }

      // Insérer les nouvelles assignations de restaurants
      const restaurantAssignments = selectedRestaurants.map(([restaurantName, data]) => ({
        employee_id: employeeId,
        restaurant: restaurantName,
        taux_horaire: parseFloat(data.taux_horaire),
        est_principal: data.est_principal,
      }));

      const { error: assignmentError } = await supabase
        .from('employee_restaurants')
        .insert(restaurantAssignments);

      if (assignmentError) throw assignmentError;

      alert(editingEmployee ? 'Employé mis à jour avec succès' : 'Employé ajouté avec succès');
      resetForm();
      fetchEmployees();

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la sauvegarde de l'employé: ${errorMessage}`);
    }
  };

  const handleEdit = (employee: EmployeeWithRestaurants) => {
    setEditingEmployee(employee);
    
    // Préparer les données du formulaire
    const restaurantData = {
      MTL_NORD: { selected: false, taux_horaire: '', est_principal: false },
      HENRI_BOURASSA: { selected: false, taux_horaire: '', est_principal: false },
    };

    employee.restaurants.forEach(restaurant => {
      restaurantData[restaurant.restaurant] = {
        selected: true,
        taux_horaire: restaurant.taux_horaire.toString(),
        est_principal: restaurant.est_principal,
      };
    });

    setFormData({
      nom: employee.nom,
      prenom: employee.prenom,
      date_naissance: employee.date_naissance,
      nas: employee.nas,
      adresse: employee.adresse,
      taux_horaire_principal: employee.taux_horaire_principal.toString(),
      color: employee.color || '#3B82F6',
      restaurants: restaurantData,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveEmployee = (employeeId: string, employeeName: string) => {
    setDeleteConfirmation({ employeeId, employeeName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      // Essayer d'abord la suppression logique (marquer comme inactif)
      let { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', deleteConfirmation.employeeId);

      // Si erreur 42703 (colonne inexistante), faire une vraie suppression
      if (error && error.code === '42703') {
        console.log('Colonne is_active non trouvée, suppression physique de l\'employé...');
        const result = await supabase
          .from('employees')
          .delete()
          .eq('id', deleteConfirmation.employeeId);
        
        error = result.error;
      }

      if (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de l\'employé: ' + error.message);
        return;
      }

      await fetchEmployees();
      
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

  const handleRestaurantChange = (restaurantName: 'MTL_NORD' | 'HENRI_BOURASSA', field: 'selected' | 'taux_horaire' | 'est_principal', value: boolean | string) => {
    setFormData(prev => {
      const newRestaurants = {
        ...prev.restaurants,
        [restaurantName]: {
          ...prev.restaurants[restaurantName],
          [field]: value,
          // Si on désélectionne un restaurant, on le retire aussi comme principal
          ...(field === 'selected' && !value ? { est_principal: false } : {}),
        },
      };

      // Si on marque comme principal, désmarquer l'autre
      if (field === 'est_principal' && value) {
        const otherRestaurant = restaurantName === 'MTL_NORD' ? 'HENRI_BOURASSA' : 'MTL_NORD';
        newRestaurants[otherRestaurant] = {
          ...newRestaurants[otherRestaurant],
          est_principal: false,
        };
      }

      // Si on sélectionne un restaurant et que c'est le seul, le marquer automatiquement comme principal
      if (field === 'selected' && value) {
        const selectedCount = Object.values(newRestaurants).filter(r => r.selected).length;
        if (selectedCount === 1) {
          newRestaurants[restaurantName].est_principal = true;
        }
      }

      return {
        ...prev,
        restaurants: newRestaurants,
      };
    });
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      date_naissance: '',
      nas: '',
      adresse: '',
      taux_horaire_principal: '',
      color: '#3B82F6',
      restaurants: {
        MTL_NORD: { selected: false, taux_horaire: '', est_principal: false },
        HENRI_BOURASSA: { selected: false, taux_horaire: '', est_principal: false },
      },
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  // Filtrer les employés pour le restaurant sélectionné
  const filteredEmployees = employees.filter(employee => 
    employee.restaurants.some(r => r.restaurant === restaurant)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header avec bouton Add - Mobile optimized */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Employés - {restaurant === 'MTL_NORD' ? 'Montréal Nord' : 'Henri-Bourassa'}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base touch-manipulation"
        >
          {showForm ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
          <span className="hidden sm:inline">{showForm ? 'Annuler' : 'Ajouter'}</span>
          <span className="sm:hidden">{showForm ? '' : 'Nouveau'}</span>
        </button>
      </div>

      {/* Form - Mobile optimized */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
            {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Informations personnelles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prénom
                </label>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date de naissance
                </label>
                <input
                  type="date"
                  required
                  value={formData.date_naissance}
                  onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  NAS <span className="text-xs text-gray-500">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={formData.nas}
                  onChange={(e) => setFormData({ ...formData, nas: e.target.value })}
                  placeholder="123-456-789"
                  maxLength={11}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Données sensibles protégées - Accès journalisé selon PIPEDA
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse
                </label>
                <input
                  type="text"
                  required
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Taux horaire principal ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.taux_horaire_principal}
                  onChange={(e) => setFormData({ ...formData, taux_horaire_principal: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Couleur d'identification
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-20 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <div 
                    className="flex-1 px-3 py-2.5 rounded-lg text-white font-medium text-center text-sm"
                    style={{ backgroundColor: formData.color }}
                  >
                    Aperçu
                  </div>
                </div>
              </div>
            </div>

            {/* Assignations de restaurants */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Assignations de restaurants</h4>
              <div className="space-y-3">
                {(['MTL_NORD', 'HENRI_BOURASSA'] as const).map((restaurantName) => (
                  <div key={restaurantName} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <input
                        type="checkbox"
                        id={`restaurant-${restaurantName}`}
                        checked={formData.restaurants[restaurantName].selected}
                        onChange={(e) => handleRestaurantChange(restaurantName, 'selected', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`restaurant-${restaurantName}`} className="text-sm font-medium text-gray-700">
                        {restaurantName === 'MTL_NORD' ? 'Montréal Nord' : 'Henri-Bourassa'}
                      </label>
                    </div>
                    
                    {formData.restaurants[restaurantName].selected && (
                      <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Taux horaire ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={formData.restaurants[restaurantName].taux_horaire}
                            onChange={(e) => handleRestaurantChange(restaurantName, 'taux_horaire', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`principal-${restaurantName}`}
                            checked={formData.restaurants[restaurantName].est_principal}
                            onChange={(e) => handleRestaurantChange(restaurantName, 'est_principal', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`principal-${restaurantName}`} className="ml-2 text-xs text-gray-600">
                            Restaurant principal
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base touch-manipulation"
              >
                {editingEmployee ? 'Mettre à jour' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-base touch-manipulation"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nom complet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date de naissance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Restaurants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NAS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taux horaire
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Aucun employé trouvé pour ce restaurant. Ajoutez votre premier employé.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const currentRestaurantData = employee.restaurants.find(r => r.restaurant === restaurant);
                return (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: employee.color }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.nom} {employee.prenom}
                          </div>
                          <div className="text-sm text-gray-500">{employee.adresse}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(employee.date_naissance).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {employee.restaurants.map((r) => (
                          <span
                            key={r.restaurant}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              r.est_principal
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {r.est_principal && <Star className="w-3 h-3 mr-1" />}
                            {r.restaurant === 'MTL_NORD' ? 'MTL' : 'HB'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {employee.nas ? (
                        <NASDisplay 
                          nas={employee.nas}
                          employeeId={employee.id}
                          employeeName={`${employee.prenom} ${employee.nom}`}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">Non renseigné</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {currentRestaurantData?.taux_horaire.toFixed(2)} $
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRemoveEmployee(employee.id, `${employee.prenom} ${employee.nom}`)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards - Shown only on mobile */}
      <div className="md:hidden space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            Aucun employé trouvé pour ce restaurant. Ajoutez votre premier employé.
          </div>
        ) : (
          filteredEmployees.map((employee) => {
            const currentRestaurantData = employee.restaurants.find(r => r.restaurant === restaurant);
            return (
              <div key={employee.id} className="bg-white rounded-lg shadow-sm p-4 touch-manipulation">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 flex items-start gap-2">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: employee.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {employee.prenom} {employee.nom}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1 mb-1">
                        {employee.restaurants.map((r) => (
                          <span
                            key={r.restaurant}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              r.est_principal
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {r.est_principal && <Star className="w-3 h-3 mr-1" />}
                            {r.restaurant === 'MTL_NORD' ? 'MTL' : 'HB'}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">{employee.adresse}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveEmployee(employee.id, `${employee.prenom} ${employee.nom}`)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Naissance:</span>
                    <span className="ml-1 text-gray-900 font-medium">
                      {new Date(employee.date_naissance).toLocaleDateString('fr-CA')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Taux:</span>
                    <span className="ml-1 text-gray-900 font-medium">
                      {currentRestaurantData?.taux_horaire.toFixed(2)} $
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block mb-1">NAS:</span>
                    {employee.nas ? (
                      <NASDisplay 
                        nas={employee.nas}
                        employeeId={employee.id}
                        employeeName={`${employee.prenom} ${employee.nom}`}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">Non renseigné</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <p className="text-lg font-semibold mb-4 text-gray-900">
              Êtes-vous sûr de vouloir supprimer l'employé {deleteConfirmation.employeeName} ?
            </p>
            <p className="text-sm text-gray-600 mb-6">
              L'employé sera retiré de la liste active mais son historique dans les emplois du temps passés sera conservé.
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
    </div>
  );
}