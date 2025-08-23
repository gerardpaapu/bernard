import { init } from './main';
import './style.css';

const canvas = document.createElement('canvas');
canvas.width = 1024;
canvas.height = 768;
const appElement = document.querySelector<HTMLDivElement>('#app');
if (appElement) {
  console.log('butts');
  appElement.append(canvas);
  init(canvas);
} else {
  console.error('Could not find #app element');
}
