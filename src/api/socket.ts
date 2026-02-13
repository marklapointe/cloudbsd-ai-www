import { io } from 'socket.io-client';

const defaultPort = 3001;
const host = window.location.hostname === 'localhost' ? `localhost:${defaultPort}` : window.location.host;
const socketURL = `${window.location.protocol}//${host}`;

const socket = io(socketURL);

export default socket;
