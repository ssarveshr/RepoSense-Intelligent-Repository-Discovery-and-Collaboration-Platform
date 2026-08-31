import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App.jsx';
import ProfileAuthProvider from './providers/ProfileAuthProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProfileAuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ProfileAuthProvider>
  </StrictMode>,
);
