import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI } from './config.js';
import axios from 'axios';

export async function getAccessToken(code) {
    const credentials = Buffer
        .from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
        .toString('base64')
    
    const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
    }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
        }
    })

    return response.data.access_token;
}