import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWindow } from './components/chat/ChatWindow';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChatWindow onClose={() => {
      // Close the window when user clicks close
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().close();
      });
    }} />
  </React.StrictMode>
);
