import Pusher from 'pusher-js';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY;
const WS_HOST = import.meta.env.VITE_PUSHER_HOST;
const WS_PORT = Number(import.meta.env.VITE_PUSHER_PORT || '443');
const FORCE_TLS = import.meta.env.VITE_PUSHER_TLS === 'true';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!PUSHER_KEY || !WS_HOST || !API_BASE_URL) {
    console.error('Missing Pusher/API configuration. Please set VITE_PUSHER_KEY, VITE_PUSHER_HOST, and VITE_API_BASE_URL');
}

let pusher: Pusher | null = null;

export const getPusher = () => {
    if (pusher) return pusher;

    const token = localStorage.getItem('admin_token');

    pusher = new Pusher(PUSHER_KEY || '', {
        wsHost: WS_HOST || '',
        wsPort: WS_PORT,
        forceTLS: FORCE_TLS,
        disableStats: true,
        enabledTransports: FORCE_TLS ? ['ws', 'wss'] : ['ws'],
        cluster: 'mt1',
        authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        },
    });

    return pusher;
};

export const disconnectPusher = () => {
    if (pusher) {
        pusher.disconnect();
        pusher = null;
    }
};
