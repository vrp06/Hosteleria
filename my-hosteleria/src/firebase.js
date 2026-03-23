const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
  alumnesCollection: process.env.REACT_APP_FIREBASE_ALUMNES_COLLECTION || 'alumnes',
  restaurantsCollection: process.env.REACT_APP_FIREBASE_RESTAURANTS_COLLECTION || 'restaurants',
};

export const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const getFirebaseConfig = () => firebaseConfig;
