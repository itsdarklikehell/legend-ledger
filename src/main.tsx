import { render } from 'preact';
import { App } from './App';
import { APP_NAME } from './app-meta';
import './styles/index.css';

const root = document.getElementById('app');
if (!root) throw new Error(`${APP_NAME} could not find its application root.`);

render(<App />, root);
