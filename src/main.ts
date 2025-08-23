import { init } from './init';
import './style.css';

const canvas = document.createElement('canvas');
canvas.width = 1024;
canvas.height = 768;
document.querySelector<HTMLDivElement>('#app')!.append(canvas);
init(canvas);
