import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Agar ye file nahi hai to is line ko bhi hata dena
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);