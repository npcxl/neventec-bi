import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';
import 'antd/dist/reset.css';

type BuildInfo = {
  version?: string;
  gitHash?: string;
  buildTime?: string;
};

//时间格式化
function formatBuildTime(buildTime?: string) {
  if (!buildTime) return '';
  const date = new Date(buildTime);
  if (Number.isNaN(date.getTime())) return buildTime;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}
  -${pad(date.getMonth() + 1)}
  -${pad(date.getDate())} 
   ${pad(date.getHours())}
  :${pad(date.getMinutes())}
  :${pad(date.getSeconds())}`;
}

//输出版本信息  构建后Vite或在生产版本上的Console中输出
const buildInfoPromise = fetch('/version.json')
  .then((response) => response.json())
  .then((buildInfo: BuildInfo) => {
    const formattedBuildInfo = {
      ...buildInfo,
      buildTime: formatBuildTime(buildInfo.buildTime),
    };
    console.log('[update-info]', formattedBuildInfo);
    return formattedBuildInfo;
  })
  .catch((error) => {
    console.warn('[update-info] failed to load /version.json', error);
    return null;
  });

void buildInfoPromise;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
