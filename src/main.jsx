import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/store';
import App from './components/App';
import './App.css';

// Create root and render
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    // Remove StrictMode to prevent double execution in development
    <Provider store={store}>
      <App />
    </Provider>
  );
}