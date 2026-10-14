import React from 'react';
import ReactDOM from 'react-dom/client';
import { ShopSphereApp } from './ShopSphereApp.tsx';

const rootElem = document.getElementById('shopsphere-root');
if (rootElem) {
  const root = ReactDOM.createRoot(rootElem);
  root.render(
    <React.StrictMode>
      <ShopSphereApp />
    </React.StrictMode>
  );
}
