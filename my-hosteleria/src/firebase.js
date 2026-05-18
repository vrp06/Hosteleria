const rawFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBpx_szcDUPmXWI_zHL3JuPQSBEiUC7K8E',
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    'reacthosteleriajoviat-26273.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'reacthosteleriajoviat-26273',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    'reacthosteleriajoviat-26273.firebasestorage.app',
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '29602822309',
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID || '1:29602822309:web:bb5dc73d5ca0eb0d75f54c',
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || 'G-NJK9C1B82V',
};

const collectionConfig = {
  administratorCollection:
    process.env.REACT_APP_FIREBASE_ADMINISTRATOR_COLLECTION || 'Administrator',
  accessRequestsCollection:
    process.env.REACT_APP_FIREBASE_ACCESS_REQUESTS_COLLECTION || 'AccessRequests',
  alumniCollection: process.env.REACT_APP_FIREBASE_ALUMNI_COLLECTION || 'Alumni',
  restAlumCollection: process.env.REACT_APP_FIREBASE_REST_ALUM_COLLECTION || 'Rest-Alum',
  restaurantCollection: process.env.REACT_APP_FIREBASE_RESTAURANT_COLLECTION || 'Restaurant',
};

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];

export const hasFirebaseConfig = requiredConfigKeys.every(
  (key) => typeof rawFirebaseConfig[key] === 'string' && rawFirebaseConfig[key].trim() !== ''
);

export const app = null;
export const getFirebaseConfig = () => ({
  ...rawFirebaseConfig,
  ...collectionConfig,
});

const firebaseApp = app;
export default firebaseApp;
