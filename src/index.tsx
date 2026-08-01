import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

console.log('🌟 [index.tsx] 앱 시작!');
console.log('🌟 [index.tsx] React 버전:', React.version);
console.log('🌟 [index.tsx] root 엘리먼트:', document.getElementById('root'));

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

console.log('🌟 [index.tsx] root 생성 완료, App 렌더링 시작...');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('🌟 [index.tsx] App 렌더링 완료!'); 