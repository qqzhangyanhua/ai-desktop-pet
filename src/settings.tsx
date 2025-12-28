import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameSettingsWindow } from './components/settings/GameSettingsWindow';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameSettingsWindow />
  </React.StrictMode>
);
