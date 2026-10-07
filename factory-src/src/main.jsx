import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// 캔버스 라벨이 대체 글꼴로 그려지지 않도록, 한글 웹폰트를 먼저 불러온 뒤 시작한다
const fontsReady = document.fonts?.load
  ? Promise.all([
      document.fonts.load('700 40px "IBM Plex Sans KR"'),
      document.fonts.load('500 30px "IBM Plex Sans KR"'),
    ]).catch(() => {})
  : Promise.resolve();

Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => {
  createRoot(document.getElementById('root')).render(<App />);
});
