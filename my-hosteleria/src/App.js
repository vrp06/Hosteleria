import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { getFirebaseConfig, hasFirebaseConfig } from './firebase';

const baseNavItems = [
  { key: 'inici', label: 'Inici' },
  { key: 'alumnes', label: 'Visualitzar Alumnes' },
  { key: 'restaurants', label: 'Restaurants' },
];

const firestoreString = (field) => field?.stringValue ?? '';
const firestoreBoolean = (field) => field?.booleanValue ?? false;
const firestoreGeoPoint = (field) => field?.geoPointValue ?? null;
const firestoreReferenceId = (field) => field?.referenceValue?.split('/').pop() ?? '';

const parseAlumniDoc = (doc, index) => {
  const fields = doc?.fields ?? {};
  const id = doc?.name?.split('/').pop() || `alumni-${index}`;

  return {
    id,
    nom: firestoreString(fields.Name) || `Alumni ${index + 1}`,
    rol: firestoreString(fields.Status) || 'Sense estat',
    status: firestoreString(fields.Status) || 'Sense estat',
    imatge: firestoreString(fields.PhotoURL) || '/user_default',
    email: firestoreString(fields.email),
    restaurantsIds: [],
    restaurantRoles: [],
  };
};

const parseRestaurantDoc = (doc, index) => {
  const fields = doc?.fields ?? {};
  const id = doc?.name?.split('/').pop() || `restaurant-${index}`;
  const location = firestoreGeoPoint(fields.Location) || firestoreGeoPoint(fields.location);

  return {
    id,
    nom: firestoreString(fields.Name) || firestoreString(fields.name) || `Restaurant ${index + 1}`,
    adreca: firestoreString(fields.Address) || 'Sense adreça',
    imatge: firestoreString(fields.PhotoURL) || '/restaurant_default',
    ubicacio: location,
    alumnesIds: [],
    alumnesRoles: [],
  };
};

const parseRelationDoc = (doc, index) => {
  const fields = doc?.fields ?? {};

  return {
    id: doc?.name?.split('/').pop() || `relation-${index}`,
    alumniId: firestoreReferenceId(fields.id_alumni),
    restaurantId: firestoreReferenceId(fields.id_restaurant),
    rol: firestoreString(fields.rol) || 'Sense rol',
    currentJob: firestoreBoolean(fields.current_job),
  };
};

const parseAdministratorDoc = (doc) => {
  const fields = doc?.fields ?? {};
  return (firestoreString(fields.Email) || firestoreString(fields.email)).trim().toLowerCase();
};

const buildLinkedData = (alumniDocs, restaurantDocs, relationDocs) => {
  const alumniMap = new Map(alumniDocs.map((alumni) => [alumni.id, { ...alumni }]));
  const restaurantMap = new Map(restaurantDocs.map((restaurant) => [restaurant.id, { ...restaurant }]));

  relationDocs.forEach((relation) => {
    const alumni = alumniMap.get(relation.alumniId);
    const restaurant = restaurantMap.get(relation.restaurantId);

    if (!alumni || !restaurant) {
      return;
    }

    if (!alumni.restaurantsIds.includes(restaurant.id)) {
      alumni.restaurantsIds.push(restaurant.id);
    }

    if (!restaurant.alumnesIds.includes(alumni.id)) {
      restaurant.alumnesIds.push(alumni.id);
    }

    if (relation.currentJob) {
      alumni.restaurantRoles.push({ restaurantId: restaurant.id, rol: relation.rol });
      restaurant.alumnesRoles.push({ alumneId: alumni.id, rol: relation.rol });
    }
  });

  return {
    alumnes: Array.from(alumniMap.values()),
    restaurants: Array.from(restaurantMap.values()),
  };
};

const restorePageState = (snapshot, setSelectedAlumne, setSelectedRestaurant, setActivePage) => {
  setSelectedAlumne(snapshot.selectedAlumne || null);
  setSelectedRestaurant(snapshot.selectedRestaurant || null);
  setActivePage(snapshot.page);
};

const alumniToFirestoreFields = (profile) => ({
  Name: { stringValue: profile.nom || '' },
  PhotoURL: { stringValue: profile.imatge || '' },
  Status: { stringValue: profile.status || '' },
  email: { stringValue: profile.email || '' },
});

const restaurantToFirestoreFields = (restaurant) => ({
  Name: { stringValue: restaurant.nom || '' },
  Address: { stringValue: restaurant.adreca || '' },
  PhotoURL: { stringValue: restaurant.imatge || '' },
});

const buildFirestoreReference = (projectId, collection, id) =>
  `projects/${projectId}/databases/(default)/documents/${collection}/${id}`;

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('inici');
  const [searchAlumnes, setSearchAlumnes] = useState('');
  const [searchRestaurants, setSearchRestaurants] = useState('');
  const [selectedAlumne, setSelectedAlumne] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [alumnes, setAlumnes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [dataSource, setDataSource] = useState('firebase');
  const [dataError, setDataError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [adminEmails, setAdminEmails] = useState([]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [signUpForm, setSignUpForm] = useState({
    nom: '',
    imatge: '',
    status: '',
    email: '',
    password: '',
  });
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState('');
  const [editingAlumneId, setEditingAlumneId] = useState(null);
  const [editingForm, setEditingForm] = useState({ nom: '', imatge: '', status: '', email: '' });
  const [managementMessage, setManagementMessage] = useState('');
  const [managementError, setManagementError] = useState('');
  const [managementPage, setManagementPage] = useState('menu');
  const [newAlumneForm, setNewAlumneForm] = useState({
    nom: '',
    email: '',
    password: '',
    status: '',
    imatge: '',
    restaurantFilter: '',
    links: [{ restaurantId: '', rol: '', currentJob: false }],
  });
  const [newRestaurantForm, setNewRestaurantForm] = useState({
    nom: '',
    adreca: '',
    imatge: '',
    alumneFilter: '',
    links: [{ alumneId: '', rol: '', currentJob: false }],
  });

  useEffect(() => {
    const closeOnResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', closeOnResize);
    return () => window.removeEventListener('resize', closeOnResize);
  }, []);

  useEffect(() => {
    const loadFirebaseData = async () => {
      if (!hasFirebaseConfig || typeof fetch !== 'function') {
        setAlumnes([]);
        setRestaurants([]);
        setAdminEmails([]);
        setDataSource('local');
        setDataError('Error de conexión con el servidor');
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      setDataError('');

      try {
        const config = getFirebaseConfig();
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

        const [alumniResponse, restaurantResponse, relationResponse, administratorResponse] =
          await Promise.all([
            fetch(`${baseUrl}/${config.alumniCollection}?key=${config.apiKey}`),
            fetch(`${baseUrl}/${config.restaurantCollection}?key=${config.apiKey}`),
            fetch(`${baseUrl}/${config.restAlumCollection}?key=${config.apiKey}`),
            fetch(`${baseUrl}/${config.administratorCollection}?key=${config.apiKey}`),
          ]);

        if (
          !alumniResponse.ok ||
          !restaurantResponse.ok ||
          !relationResponse.ok ||
          !administratorResponse.ok
        ) {
          throw new Error('firebase-response-error');
        }

        const [alumniPayload, restaurantPayload, relationPayload, administratorPayload] =
          await Promise.all([
            alumniResponse.json(),
            restaurantResponse.json(),
            relationResponse.json(),
            administratorResponse.json(),
          ]);

        const alumniDocs = (alumniPayload.documents || []).map(parseAlumniDoc);
        const restaurantDocs = (restaurantPayload.documents || []).map(parseRestaurantDoc);
        const relationDocs = (relationPayload.documents || []).map(parseRelationDoc);
        const administratorDocs = (administratorPayload.documents || []).map(parseAdministratorDoc);
        const linkedData = buildLinkedData(alumniDocs, restaurantDocs, relationDocs);

        if (linkedData.alumnes.length === 0 && linkedData.restaurants.length === 0) {
          throw new Error('firebase-empty-data');
        }

        setAlumnes(linkedData.alumnes);
        setRestaurants(linkedData.restaurants);
        setAdminEmails(administratorDocs.filter(Boolean));
        setDataSource('firebase');
      } catch (_error) {
        setAlumnes([]);
        setRestaurants([]);
        setAdminEmails([]);
        setDataSource('local');
        setDataError('Error de conexión con el servidor');
      } finally {
        setDataLoading(false);
      }
    };

    loadFirebaseData();
  }, []);

  const restaurantById = useMemo(
    () => Object.fromEntries(restaurants.map((restaurant) => [String(restaurant.id), restaurant])),
    [restaurants]
  );
  const alumneById = useMemo(
    () => Object.fromEntries(alumnes.map((alumne) => [String(alumne.id), alumne])),
    [alumnes]
  );

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (!authUser) {
      items.push({ key: 'signup', label: 'SignUp' });
    }
    if (authUser?.isAdmin) {
      items.push({ key: 'gestio', label: 'Gestión' });
    }
    items.push({ key: authUser ? 'logout' : 'login', label: authUser ? 'Logout' : 'Login' });
    return items;
  }, [authUser]);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const goToPage = async (page) => {
    if (page === 'logout') {
      setAuthUser(null);
      setLoginError('');
      setLoginPassword('');
      setManagementMessage('');
      setManagementError('');
      setManagementPage('menu');
      setActivePage('inici');
      setPageHistory([]);
      closeSidebarOnMobile();
      return;
    }

    if (page === 'gestio') {
      setManagementPage('menu');
    }
    setActivePage(page);
    closeSidebarOnMobile();
  };

  const navigateToDetail = (page, payload) => {
    setPageHistory((current) => [
      ...current,
      {
        page: activePage,
        selectedAlumne,
        selectedRestaurant,
      },
    ]);

    if (page === 'alumneDetail') {
      setSelectedAlumne(payload);
      setSelectedRestaurant(null);
    }

    if (page === 'restaurantDetail') {
      setSelectedRestaurant(payload);
      setSelectedAlumne(null);
    }

    setActivePage(page);
    closeSidebarOnMobile();
  };

  const goBack = (fallbackPage) => {
    if (pageHistory.length === 0) {
      setSelectedAlumne(null);
      setSelectedRestaurant(null);
      setActivePage(fallbackPage);
      return;
    }

    const previousEntry = pageHistory[pageHistory.length - 1];
    setPageHistory((current) => current.slice(0, -1));
    restorePageState(previousEntry, setSelectedAlumne, setSelectedRestaurant, setActivePage);
  };

  const filteredAlumnes = useMemo(() => {
    const term = searchAlumnes.trim().toLowerCase();
    if (!term) {
      return alumnes;
    }

    return alumnes.filter(
      (alumne) =>
        alumne.nom.toLowerCase().includes(term) ||
        alumne.rol.toLowerCase().includes(term) ||
        alumne.email.toLowerCase().includes(term)
    );
  }, [alumnes, searchAlumnes]);

  const filteredRestaurants = useMemo(() => {
    const term = searchRestaurants.trim().toLowerCase();
    if (!term) {
      return restaurants;
    }

    return restaurants.filter(
      (restaurant) =>
        restaurant.nom.toLowerCase().includes(term) || restaurant.adreca.toLowerCase().includes(term)
    );
  }, [restaurants, searchRestaurants]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError('');

    if (!hasFirebaseConfig) {
      setLoginError('Falta configurar Firebase en src/firebase.js o variables REACT_APP_FIREBASE_*');
      return;
    }

    const normalizedEmail = loginEmail.trim().toLowerCase();
    if (!normalizedEmail || !loginPassword.trim()) {
      setLoginError('Introduce email y contraseña');
      return;
    }

    setLoginLoading(true);

    try {
      const config = getFirebaseConfig();
      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: loginPassword,
            returnSecureToken: true,
          }),
        }
      );
      const authPayload = await authResponse.json();
      if (!authResponse.ok) {
        throw new Error(authPayload.error?.message || 'signin-auth-error');
      }
      setAuthUser({ email: normalizedEmail, isAdmin: adminEmails.includes(normalizedEmail) });
      setLoginPassword('');
      setActivePage('inici');
    } catch (_error) {
      setLoginError('Credenciales inválidas en Firebase Auth');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignUpChange = (field, value) => {
    setSignUpForm((current) => ({ ...current, [field]: value }));
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setSignUpError('');
    setSignUpSuccess('');

    if (!hasFirebaseConfig) {
      setSignUpError('Firebase Auth no está configurado');
      return;
    }

    const config = getFirebaseConfig();
    const normalizedEmail = signUpForm.email.trim().toLowerCase();

    if (!normalizedEmail || !signUpForm.password.trim()) {
      setSignUpError('Email y password son obligatorios');
      return;
    }

    setSignUpLoading(true);

    try {
      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: signUpForm.password,
            returnSecureToken: true,
          }),
        }
      );
      const authPayload = await authResponse.json();
      if (!authResponse.ok) {
        throw new Error(authPayload.error?.message || 'signup-auth-error');
      }

      const profile = {
        id: authPayload.localId,
        nom: signUpForm.nom.trim() || normalizedEmail.split('@')[0],
        status: signUpForm.status.trim() || 'Nou registre',
        imatge: signUpForm.imatge.trim() || '/user_default',
        email: normalizedEmail,
        restaurantsIds: [],
        restaurantRoles: [],
      };

      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const profileResponse = await fetch(
        `${baseUrl}/${config.alumniCollection}?documentId=${authPayload.localId}&key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: alumniToFirestoreFields(profile) }),
        }
      );

      const profilePayload = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(profilePayload.error?.message || 'signup-profile-error');
      }

      setAlumnes((current) => [...current, profile]);
      setSignUpForm({ nom: '', imatge: '', status: '', email: '', password: '' });
      setSignUpSuccess('Alumno registrado correctamente');
    } catch (error) {
      setSignUpError(error.message || 'No se ha podido completar el registro');
    } finally {
      setSignUpLoading(false);
    }
  };

  const startEditingAlumne = (alumne) => {
    setEditingAlumneId(alumne.id);
    setEditingForm({
      nom: alumne.nom,
      imatge: alumne.imatge === '/user_default' ? '' : alumne.imatge,
      status: alumne.status,
      email: alumne.email,
    });
    setManagementMessage('');
    setManagementError('');
  };

  const handleSaveAlumne = async (alumneId) => {
    setManagementMessage('');
    setManagementError('');

    try {
      const config = getFirebaseConfig();
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const updatedProfile = {
        id: alumneId,
        nom: editingForm.nom.trim(),
        imatge: editingForm.imatge.trim() || '/user_default',
        status: editingForm.status.trim(),
        email: editingForm.email.trim().toLowerCase(),
      };

      const patchUrl = new URL(`${baseUrl}/${config.alumniCollection}/${alumneId}`);
      patchUrl.searchParams.set('key', config.apiKey);
      ['Name', 'PhotoURL', 'Status', 'email'].forEach((fieldPath) =>
        patchUrl.searchParams.append('updateMask.fieldPaths', fieldPath)
      );

      const response = await fetch(patchUrl.toString(), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: alumniToFirestoreFields(updatedProfile) }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || 'update-alumni-error');
      }

      setAlumnes((current) =>
        current.map((alumne) =>
          alumne.id === alumneId ? { ...alumne, ...updatedProfile } : alumne
        )
      );
      setEditingAlumneId(null);
      setManagementMessage('Perfil actualizado correctamente');
    } catch (error) {
      setManagementError(error.message || 'No se ha podido actualizar el perfil');
    }
  };

  const handleDeleteAlumne = async (alumneId) => {
    setManagementMessage('');
    setManagementError('');

    try {
      const config = getFirebaseConfig();
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const response = await fetch(
        `${baseUrl}/${config.alumniCollection}/${alumneId}?key=${config.apiKey}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error?.message || 'delete-alumni-error');
      }

      setAlumnes((current) => current.filter((alumne) => alumne.id !== alumneId));
      setManagementMessage('Perfil eliminado correctamente');
    } catch (error) {
      setManagementError(error.message || 'No se ha podido eliminar el perfil');
    }
  };

  const createRelation = async ({ alumniId, restaurantId, rol, currentJob }) => {
    const config = getFirebaseConfig();
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

    const relationResponse = await fetch(`${baseUrl}/${config.restAlumCollection}?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          id_alumni: {
            referenceValue: buildFirestoreReference(config.projectId, config.alumniCollection, alumniId),
          },
          id_restaurant: {
            referenceValue: buildFirestoreReference(
              config.projectId,
              config.restaurantCollection,
              restaurantId
            ),
          },
          rol: { stringValue: rol || 'Sense rol' },
          current_job: { booleanValue: Boolean(currentJob) },
        },
      }),
    });

    if (!relationResponse.ok) {
      const payload = await relationResponse.json();
      throw new Error(payload.error?.message || 'create-relation-error');
    }
  };

  const addAlumneLink = () => {
    setNewAlumneForm((current) => ({
      ...current,
      links: [...current.links, { restaurantId: '', rol: '', currentJob: false }],
    }));
  };

  const removeAlumneLink = (index) => {
    setNewAlumneForm((current) => ({
      ...current,
      links: current.links.length === 1 ? current.links : current.links.filter((_, i) => i !== index),
    }));
  };

  const updateAlumneLink = (index, field, value) => {
    setNewAlumneForm((current) => ({
      ...current,
      links: current.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }));
  };

  const addRestaurantLink = () => {
    setNewRestaurantForm((current) => ({
      ...current,
      links: [...current.links, { alumneId: '', rol: '', currentJob: false }],
    }));
  };

  const removeRestaurantLink = (index) => {
    setNewRestaurantForm((current) => ({
      ...current,
      links: current.links.length === 1 ? current.links : current.links.filter((_, i) => i !== index),
    }));
  };

  const updateRestaurantLink = (index, field, value) => {
    setNewRestaurantForm((current) => ({
      ...current,
      links: current.links.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    }));
  };

  const handleCreateAlumneFromManagement = async (event) => {
    event.preventDefault();
    setManagementError('');
    setManagementMessage('');

    const normalizedEmail = newAlumneForm.email.trim().toLowerCase();
    if (!normalizedEmail || !newAlumneForm.password.trim()) {
      setManagementError('Para crear un alumno necesitas email y contraseña');
      return;
    }

    try {
      const config = getFirebaseConfig();
      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            password: newAlumneForm.password,
            returnSecureToken: true,
          }),
        }
      );
      const authPayload = await authResponse.json();
      if (!authResponse.ok) {
        throw new Error(authPayload.error?.message || 'create-alumni-auth-error');
      }
      const alumne = {
        id: authPayload.localId,
        nom: newAlumneForm.nom.trim() || normalizedEmail.split('@')[0],
        status: newAlumneForm.status.trim() || 'Nou registre',
        imatge: newAlumneForm.imatge.trim() || '/user_default',
        email: normalizedEmail,
        restaurantsIds: newAlumneForm.links.map((link) => link.restaurantId).filter(Boolean),
        restaurantRoles: [],
      };
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const profileResponse = await fetch(
        `${baseUrl}/${config.alumniCollection}?documentId=${alumne.id}&key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: alumniToFirestoreFields(alumne) }),
        }
      );

      if (!profileResponse.ok) {
        const payload = await profileResponse.json();
        throw new Error(payload.error?.message || 'create-alumni-error');
      }

      const validLinks = newAlumneForm.links.filter((link) => link.restaurantId);
      await Promise.all(
        validLinks.map((link) =>
          createRelation({
            alumniId: alumne.id,
            restaurantId: link.restaurantId,
            rol: link.rol.trim(),
            currentJob: link.currentJob,
          })
        )
      );

      setAlumnes((current) => [...current, alumne]);
      setRestaurants((current) =>
        current.map((restaurant) => {
          const linked = validLinks.some((link) => link.restaurantId === restaurant.id);
          return linked
            ? { ...restaurant, alumnesIds: [...restaurant.alumnesIds, alumne.id] }
            : restaurant;
        })
      );
      setNewAlumneForm({
        nom: '',
        email: '',
        password: '',
        status: '',
        imatge: '',
        restaurantFilter: '',
        links: [{ restaurantId: '', rol: '', currentJob: false }],
      });
      setManagementMessage('Alumno creado correctamente');
    } catch (error) {
      setManagementError(error.message || 'No se pudo crear el alumno');
    }
  };

  const handleCreateRestaurant = async (event) => {
    event.preventDefault();
    setManagementError('');
    setManagementMessage('');

    if (!newRestaurantForm.nom.trim()) {
      setManagementError('El nombre del restaurante es obligatorio');
      return;
    }

    try {
      const config = getFirebaseConfig();
      const restaurant = {
        nom: newRestaurantForm.nom.trim(),
        adreca: newRestaurantForm.adreca.trim() || 'Sense adreça',
        imatge: newRestaurantForm.imatge.trim() || '/restaurant_default',
        alumnesIds: newRestaurantForm.links.map((link) => link.alumneId).filter(Boolean),
        alumnesRoles: [],
      };
      const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const response = await fetch(`${baseUrl}/${config.restaurantCollection}?key=${config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: restaurantToFirestoreFields(restaurant) }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message || 'create-restaurant-error');
      }

      const restaurantId = payload?.name?.split('/').pop();
      const newRestaurant = { ...restaurant, id: restaurantId };

      const validLinks = newRestaurantForm.links.filter((link) => link.alumneId);
      await Promise.all(
        validLinks.map((link) =>
          createRelation({
            alumniId: link.alumneId,
            restaurantId,
            rol: link.rol.trim(),
            currentJob: link.currentJob,
          })
        )
      );

      setRestaurants((current) => [...current, newRestaurant]);
      setAlumnes((current) =>
        current.map((alumne) => {
          const linked = validLinks.some((link) => link.alumneId === alumne.id);
          return linked ? { ...alumne, restaurantsIds: [...alumne.restaurantsIds, restaurantId] } : alumne;
        })
      );
      setNewRestaurantForm({
        nom: '',
        adreca: '',
        imatge: '',
        alumneFilter: '',
        links: [{ alumneId: '', rol: '', currentJob: false }],
      });
      setManagementMessage('Restaurante creado correctamente');
    } catch (error) {
      setManagementError(error.message || 'No se pudo crear el restaurante');
    }
  };

  const renderDataStatus = () => {
    if (dataLoading) {
      return <p className="data-source">Cargando datos desde Firebase...</p>;
    }

    return (
      <>
        {dataSource === 'local' && <p className="data-source">Font de dades: Local</p>}
        {dataError && <p className="login-error">{dataError}</p>}
      </>
    );
  };

  const renderRelationCards = (items, type) => (
    <div className="detail-relations-grid">
      {items.map((item) => (
        <article
          key={item.id}
          className={`relation-card ${type === 'alumne' ? 'student-card' : 'restaurant-card'}`}
        >
          <img
            src={item.imatge}
            alt={item.nom}
            className={type === 'alumne' ? 'student-image' : 'restaurant-thumb'}
          />
          <div>
            <h3>{item.nom}</h3>
            <p>{type === 'alumne' ? item.status : item.adreca}</p>
            {type === 'alumne' && <p>{item.email || 'Sense email'}</p>}
            <button
              type="button"
              className="details-button"
              onClick={() =>
                navigateToDetail(type === 'alumne' ? 'alumneDetail' : 'restaurantDetail', item)
              }
            >
              Ver detalles
            </button>
          </div>
        </article>
      ))}
    </div>
  );

  const restaurantMapUrl = (restaurant) => {
    if (!restaurant?.ubicacio) {
      return '';
    }

    const { latitude, longitude } = restaurant.ubicacio;
    const delta = 0.01;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  };

  return (
    <div className={`app-layout ${isDarkMode ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <button
          type="button"
          className="menu-toggle"
          aria-label="Abrir barra lateral"
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen((prevState) => !prevState)}
        >
          <span className="menu-line" />
          <span className="menu-line" />
          <span className="menu-line" />
        </button>

        <button
          type="button"
          className="logo-button"
          aria-label="Ir al inicio"
          onClick={() => goToPage('inici')}
        >
          <img src="/logo_joviat.webp" alt="Logo Joviat" className="brand-logo" />
        </button>

        <button
          type="button"
          className="theme-toggle"
          aria-label="Activar modo oscuro"
          onClick={() => setIsDarkMode((current) => !current)}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <nav aria-label="Navegació lateral">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.key}
              className={`nav-link ${activePage === item.key ? 'active' : ''}`}
              onClick={() => goToPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar barra lateral"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="main-content">
        {renderDataStatus()}
        {authUser && <p className="auth-badge">Sessió iniciada: {authUser.email}</p>}

        {activePage === 'inici' && (
          <section>
            <h1>Benvinguts a Hostaleria Joviat</h1>
            <p>Dades carregades des de les col·leccions Alumni, Restaurant i Rest-Alum.</p>
          </section>
        )}

        {activePage === 'signup' && (
          <section className="detail-page login-panel">
            <h2>SignUp</h2>
            <form className="login-form" onSubmit={handleSignUp}>
              <label>
                Nombre
                <input
                  type="text"
                  className="search-input"
                  value={signUpForm.nom}
                  onChange={(event) => handleSignUpChange('nom', event.target.value)}
                />
              </label>
              <label>
                PhotoURL
                <input
                  type="text"
                  className="search-input"
                  value={signUpForm.imatge}
                  onChange={(event) => handleSignUpChange('imatge', event.target.value)}
                />
              </label>
              <label>
                Status
                <input
                  type="text"
                  className="search-input"
                  value={signUpForm.status}
                  onChange={(event) => handleSignUpChange('status', event.target.value)}
                />
              </label>
              <label>
                Email *
                <input
                  type="email"
                  className="search-input"
                  value={signUpForm.email}
                  onChange={(event) => handleSignUpChange('email', event.target.value)}
                />
              </label>
              <label>
                Password *
                <input
                  type="password"
                  className="search-input"
                  value={signUpForm.password}
                  onChange={(event) => handleSignUpChange('password', event.target.value)}
                />
              </label>
              {signUpError && <p className="login-error">{signUpError}</p>}
              {signUpSuccess && <p className="auth-badge">{signUpSuccess}</p>}
              <button type="submit" className="details-button" disabled={signUpLoading}>
                {signUpLoading ? 'Registrando...' : 'Crear cuenta'}
              </button>
            </form>
          </section>
        )}

        {activePage === 'login' && (
          <section className="detail-page login-panel">
            <h2>Login con Firebase Auth</h2>
            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  className="search-input"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  className="search-input"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>
              <p className="students-subtitle">
                El acceso de administrador se valida con la colección Administrator después de iniciar
                sesión.
              </p>
              {loginError && <p className="login-error">{loginError}</p>}
              <button type="submit" className="details-button" disabled={loginLoading}>
                {loginLoading ? 'Comprovant accés...' : 'Entrar'}
              </button>
            </form>
          </section>
        )}

        {activePage === 'gestio' && authUser?.isAdmin && (
          <section>
            <h2>Gestión</h2>
            <p>Selecciona la acción que quieres realizar.</p>
            {managementError && <p className="login-error">{managementError}</p>}
            {managementMessage && <p className="auth-badge">{managementMessage}</p>}
            <div className="management-menu-grid">
              <button type="button" className="details-button" onClick={() => setManagementPage('createAlumne')}>
                Crear alumnos
              </button>
              <button
                type="button"
                className="details-button"
                onClick={() => setManagementPage('createRestaurant')}
              >
                Crear restaurantes
              </button>
              <button type="button" className="details-button" onClick={() => setManagementPage('manageAlumnes')}>
                Gestionar alumnos
              </button>
              <button
                type="button"
                className="details-button"
                onClick={() => setManagementPage('manageRestaurants')}
              >
                Gestionar restaurantes
              </button>
            </div>

            {managementPage === 'createAlumne' && (
              <section className="admin-form-page">
                <p className="admin-label">ADMINISTRACIO</p>
                <h3 className="admin-title">Afegir Alumne</h3>
                <p className="admin-subtitle">
                  Dona d'alta un alumne nou i relaciona'l amb tants restaurants com calgui.
                </p>
                <form className="admin-form-layout" onSubmit={handleCreateAlumneFromManagement}>
                  <article className="admin-panel">
                    <h4>Informacio primaria</h4>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Nom complet"
                      value={newAlumneForm.nom}
                      onChange={(event) =>
                        setNewAlumneForm((current) => ({ ...current, nom: event.target.value }))
                      }
                    />
                    <div className="admin-grid-2">
                      <input
                        type="email"
                        className="search-input"
                        placeholder="Correu electronic*"
                        value={newAlumneForm.email}
                        onChange={(event) =>
                          setNewAlumneForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                      <input
                        type="password"
                        className="search-input"
                        placeholder="Contrasenya*"
                        value={newAlumneForm.password}
                        onChange={(event) =>
                          setNewAlumneForm((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                    </div>
                    <div className="admin-grid-2">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Photo URL"
                        value={newAlumneForm.imatge}
                        onChange={(event) =>
                          setNewAlumneForm((current) => ({ ...current, imatge: event.target.value }))
                        }
                      />
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Estat de l'alumne"
                        value={newAlumneForm.status}
                        onChange={(event) =>
                          setNewAlumneForm((current) => ({ ...current, status: event.target.value }))
                        }
                      />
                    </div>
                  </article>

                  <article className="admin-panel">
                    <div className="admin-links-header">
                      <h4>Trajectoria professional · Restaurants</h4>
                      <button type="button" className="back-button" onClick={addAlumneLink}>
                        Afegir restaurant
                      </button>
                    </div>
                    <input
                      type="search"
                      className="search-input"
                      placeholder="Filtrar restaurants pel nom"
                      value={newAlumneForm.restaurantFilter}
                      onChange={(event) =>
                        setNewAlumneForm((current) => ({
                          ...current,
                          restaurantFilter: event.target.value,
                        }))
                      }
                    />
                    {newAlumneForm.links.map((link, index) => (
                      <div className="relation-editor" key={`alumne-link-${index}`}>
                        <div className="relation-editor-head">
                          <h5>Restaurant {index + 1}</h5>
                          <button
                            type="button"
                            className="back-button"
                            onClick={() => removeAlumneLink(index)}
                          >
                            Eliminar
                          </button>
                        </div>
                        <select
                          className="search-input"
                          value={link.restaurantId}
                          onChange={(event) => updateAlumneLink(index, 'restaurantId', event.target.value)}
                        >
                          <option value="">Selecciona un restaurant</option>
                          {restaurants
                            .filter((restaurant) =>
                              restaurant.nom
                                .toLowerCase()
                                .includes(newAlumneForm.restaurantFilter.trim().toLowerCase())
                            )
                            .map((restaurant) => (
                              <option key={restaurant.id} value={restaurant.id}>
                                {restaurant.nom}
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          className="search-input"
                          placeholder="Rol"
                          value={link.rol}
                          onChange={(event) => updateAlumneLink(index, 'rol', event.target.value)}
                        />
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={link.currentJob}
                            onChange={(event) =>
                              updateAlumneLink(index, 'currentJob', event.target.checked)
                            }
                          />
                          Esta treballant actualment en aquest restaurant
                        </label>
                      </div>
                    ))}
                    <button type="submit" className="details-button">
                      Crear alumne
                    </button>
                  </article>
                </form>
              </section>
            )}

            {managementPage === 'createRestaurant' && (
              <section className="admin-form-page">
                <p className="admin-label">ADMINISTRACIO</p>
                <h3 className="admin-title">Afegir Restaurant</h3>
                <p className="admin-subtitle">
                  Dona d'alta un restaurant nou i relaciona'l amb tants alumnes com calgui.
                </p>
                <form className="admin-form-layout" onSubmit={handleCreateRestaurant}>
                  <article className="admin-panel">
                    <h4>Informacio primaria</h4>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Nom del restaurant*"
                      value={newRestaurantForm.nom}
                      onChange={(event) =>
                        setNewRestaurantForm((current) => ({ ...current, nom: event.target.value }))
                      }
                    />
                    <div className="admin-grid-2">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Adreca"
                        value={newRestaurantForm.adreca}
                        onChange={(event) =>
                          setNewRestaurantForm((current) => ({
                            ...current,
                            adreca: event.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Photo URL"
                        value={newRestaurantForm.imatge}
                        onChange={(event) =>
                          setNewRestaurantForm((current) => ({
                            ...current,
                            imatge: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </article>

                  <article className="admin-panel">
                    <div className="admin-links-header">
                      <h4>Trajectoria professional · Alumnes</h4>
                      <button type="button" className="back-button" onClick={addRestaurantLink}>
                        Afegir alumne
                      </button>
                    </div>
                    <input
                      type="search"
                      className="search-input"
                      placeholder="Filtrar alumnes pel nom"
                      value={newRestaurantForm.alumneFilter}
                      onChange={(event) =>
                        setNewRestaurantForm((current) => ({
                          ...current,
                          alumneFilter: event.target.value,
                        }))
                      }
                    />
                    {newRestaurantForm.links.map((link, index) => (
                      <div className="relation-editor" key={`restaurant-link-${index}`}>
                        <div className="relation-editor-head">
                          <h5>Alumne {index + 1}</h5>
                          <button
                            type="button"
                            className="back-button"
                            onClick={() => removeRestaurantLink(index)}
                          >
                            Eliminar
                          </button>
                        </div>
                        <select
                          className="search-input"
                          value={link.alumneId}
                          onChange={(event) => updateRestaurantLink(index, 'alumneId', event.target.value)}
                        >
                          <option value="">Selecciona un alumne</option>
                          {alumnes
                            .filter((alumne) =>
                              alumne.nom
                                .toLowerCase()
                                .includes(newRestaurantForm.alumneFilter.trim().toLowerCase())
                            )
                            .map((alumne) => (
                              <option key={alumne.id} value={alumne.id}>
                                {alumne.nom}
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          className="search-input"
                          placeholder="Rol"
                          value={link.rol}
                          onChange={(event) => updateRestaurantLink(index, 'rol', event.target.value)}
                        />
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={link.currentJob}
                            onChange={(event) =>
                              updateRestaurantLink(index, 'currentJob', event.target.checked)
                            }
                          />
                          Esta treballant actualment en aquest restaurant
                        </label>
                      </div>
                    ))}
                    <button type="submit" className="details-button">
                      Crear restaurant
                    </button>
                  </article>
                </form>
              </section>
            )}

            {managementPage === 'manageAlumnes' && (
              <div className="detail-relations-grid">
                {alumnes.map((alumne) => (
                  <article key={alumne.id} className="detail-page management-card">
                    <img src={alumne.imatge} alt={alumne.nom} className="detail-image" />
                    {editingAlumneId === alumne.id ? (
                      <div className="login-form">
                        <label>
                          Nombre
                          <input
                            type="text"
                            className="search-input"
                            value={editingForm.nom}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, nom: event.target.value }))
                            }
                          />
                        </label>
                        <label>
                          PhotoURL
                          <input
                            type="text"
                            className="search-input"
                            value={editingForm.imatge}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, imatge: event.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Status
                          <input
                            type="text"
                            className="search-input"
                            value={editingForm.status}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, status: event.target.value }))
                            }
                          />
                        </label>
                        <label>
                          Email
                          <input
                            type="email"
                            className="search-input"
                            value={editingForm.email}
                            onChange={(event) =>
                              setEditingForm((current) => ({ ...current, email: event.target.value }))
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => handleSaveAlumne(alumne.id)}
                        >
                          Guardar cambios
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3>{alumne.nom}</h3>
                        <p>{alumne.status}</p>
                        <p>{alumne.email}</p>
                        <div className="management-actions">
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => startEditingAlumne(alumne)}
                          >
                            Editar perfil
                          </button>
                          <button
                            type="button"
                            className="back-button"
                            onClick={() => handleDeleteAlumne(alumne.id)}
                          >
                            Borrar perfil
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}

            {managementPage === 'manageRestaurants' && (
              <div className="detail-relations-grid">
                {restaurants.map((restaurant) => (
                  <article key={restaurant.id} className="detail-page management-card">
                    <img src={restaurant.imatge} alt={restaurant.nom} className="detail-image" />
                    <h3>{restaurant.nom}</h3>
                    <p>{restaurant.adreca}</p>
                    {restaurant.ubicacio && (
                      <p>
                        Ubicación: {restaurant.ubicacio.latitude}, {restaurant.ubicacio.longitude}
                      </p>
                    )}
                    <p>
                      Alumnos vinculados:{' '}
                      {(restaurant.alumnesIds || [])
                        .map((id) => alumneById[String(id)]?.nom)
                        .filter(Boolean)
                        .join(', ') || 'Sin datos'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === 'alumnes' && (
          <section className="students-section">
            <h2>Visualitzar Alumnes</h2>
            <p className="students-subtitle">Llistat d'alumnes des de la col·lecció Alumni</p>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar alumne, estat o email"
              aria-label="Buscar alumnes"
              value={searchAlumnes}
              onChange={(event) => setSearchAlumnes(event.target.value)}
            />
            {dataError ? (
              <p className="login-error">{dataError}</p>
            ) : (
              <div className="students-grid">
                {filteredAlumnes.map((alumne) => {
                  const relatedRestaurants = (alumne.restaurantsIds || [])
                    .map((restaurantId) => restaurantById[String(restaurantId)])
                    .filter(Boolean);

                  return (
                    <article className="student-card" key={alumne.id}>
                      <img src={alumne.imatge} alt={alumne.nom} className="student-image" />
                      <div>
                        <h3>{alumne.nom}</h3>
                        <p>{alumne.status}</p>
                        <p>{alumne.email || 'Sense email'}</p>
                        <p className="relation-text">
                          Restaurants:{' '}
                          {relatedRestaurants.length
                            ? relatedRestaurants.map((restaurant) => restaurant.nom).join(', ')
                            : 'Sense dades'}
                        </p>
                        <button
                          type="button"
                          className="details-button"
                          onClick={() => navigateToDetail('alumneDetail', alumne)}
                        >
                          Ver detalles
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activePage === 'alumneDetail' && selectedAlumne && (
          <section className="detail-page">
            <button type="button" className="back-button" onClick={() => goBack('alumnes')}>
              ← Retroceder
            </button>
            <h2>{selectedAlumne.nom}</h2>
            <img src={selectedAlumne.imatge} alt={selectedAlumne.nom} className="detail-image" />
            <p>
              <strong>Status:</strong> {selectedAlumne.status}
            </p>
            <p>
              <strong>Email:</strong> {selectedAlumne.email || 'Sense email'}
            </p>
            <h3>Restaurants vinculats</h3>
            {renderRelationCards(
              (selectedAlumne.restaurantsIds || [])
                .map((restaurantId) => restaurantById[String(restaurantId)])
                .filter(Boolean),
              'restaurant'
            )}
          </section>
        )}

        {activePage === 'restaurants' && (
          <section>
            <h2>Restaurants</h2>
            <p>Mapa i llistat dels restaurants disponibles.</p>
            <div className="map-wrapper">
              <iframe
                title="Mapa de restaurants Joviat"
                src="https://www.openstreetmap.org/export/embed.html?bbox=1.8100%2C41.7100%2C1.8600%2C41.7400&layer=mapnik&marker=41.7281%2C1.8272"
                loading="lazy"
              />
            </div>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar restaurant o adreça"
              aria-label="Buscar restaurants"
              value={searchRestaurants}
              onChange={(event) => setSearchRestaurants(event.target.value)}
            />
            {dataError ? (
              <p className="login-error">{dataError}</p>
            ) : (
              <div className="restaurants-grid">
                {filteredRestaurants.map((restaurant) => {
                  const relatedAlumnes = (restaurant.alumnesIds || [])
                    .map((alumneId) => alumneById[String(alumneId)])
                    .filter(Boolean);

                  return (
                    <article className="restaurant-card" key={restaurant.id}>
                      {restaurant.ubicacio && (
                        <div className="map-wrapper card-map">
                          <iframe
                            title={`Mapa de ${restaurant.nom}`}
                            src={restaurantMapUrl(restaurant)}
                            loading="lazy"
                          />
                        </div>
                      )}
                      <img src={restaurant.imatge} alt={restaurant.nom} className="detail-image" />
                      <h3>{restaurant.nom}</h3>
                      <p>{restaurant.adreca}</p>
                      {restaurant.ubicacio && (
                        <p>
                          Ubicación: {restaurant.ubicacio.latitude}, {restaurant.ubicacio.longitude}
                        </p>
                      )}
                      <p className="relation-text">
                        Alumnes:{' '}
                        {relatedAlumnes.length
                          ? relatedAlumnes.map((alumne) => alumne.nom).join(', ')
                          : 'Sense dades'}
                      </p>
                      <button
                        type="button"
                        className="details-button"
                        onClick={() => navigateToDetail('restaurantDetail', restaurant)}
                      >
                        Ver detalles
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activePage === 'restaurantDetail' && selectedRestaurant && (
          <section className="detail-page">
            <button type="button" className="back-button" onClick={() => goBack('restaurants')}>
              ← Retroceder
            </button>
            <h2>{selectedRestaurant.nom}</h2>
            <img
              src={selectedRestaurant.imatge}
              alt={selectedRestaurant.nom}
              className="detail-image"
            />
            <p>
              <strong>Adreça:</strong> {selectedRestaurant.adreca}
            </p>
            {selectedRestaurant.ubicacio && (
              <p>
                <strong>Ubicació:</strong> {selectedRestaurant.ubicacio.latitude},{' '}
                {selectedRestaurant.ubicacio.longitude}
              </p>
            )}
            {selectedRestaurant.ubicacio && (
              <div className="map-wrapper detail-map">
                <iframe
                  title={`Mapa de ${selectedRestaurant.nom}`}
                  src={restaurantMapUrl(selectedRestaurant)}
                  loading="lazy"
                />
              </div>
            )}
            <h3>Alumnes vinculats</h3>
            {renderRelationCards(
              (selectedRestaurant.alumnesIds || [])
                .map((alumneId) => alumneById[String(alumneId)])
                .filter(Boolean),
              'alumne'
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
