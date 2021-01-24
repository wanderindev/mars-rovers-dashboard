import {Footer, NavBar, PageContent} from './components.js';
import {setListeners} from "./listeners.js";
import {store} from './store.js';
import {updateApodDisabledDates} from "./utils.js";


const root = document.getElementById('root');

/**
 * @description Updates the store
 * @param {object} store - The DOM element where the page will be rendered
 * @param {object} newState - The application's state
 */
const updateStore = (store, newState) => {
    return Object.assign(store, newState);
}

/**
 * @description Updates the store and renders the page
 * @param {object} store - The DOM element where the page will be rendered
 * @param {object} newState - The application's state
 */
const updateAndRender = (store, newState) => {
    store = updateStore(store, newState);
    render(root, store);
}

/**
 * @description Renders the entire page
 * @param {object} root - The DOM element where the page will be rendered
 * @param {object} state - The application's state
 */
const render = async (root, state) => {
    root.innerHTML = App(state);
    setListeners(state);
};

/**
 * @description Returns the HTML for the entire page
 * @param {object} state - The application's state
 * @return {string} html - The HTML for the entire page
 */
const App = (state) => {
    return `
        <header></header>
        <main>
            <nav class="navbar" role="navigation" aria-label="main navigation">${NavBar(state)}</nav>
            <div>${PageContent(state)}</div>
        </main>
        <footer class="footer">${Footer()}</footer>
    `
};

/**
 * @description Calls the render() function on window.load.
 */
window.addEventListener('load', () => {
    updateApodDisabledDates(store.apod);
    render(root, store);
});

export {updateAndRender, updateStore};