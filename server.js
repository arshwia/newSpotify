import express from 'express';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import fs from 'fs';

import spotifyRouter from './routes/spotify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

//for HTTP => HTTPS
const keyPath = path.join(__dirname, 'key.pem');
const certPath = path.join(__dirname, 'cert.pem');

const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', spotifyRouter);

app.use((req, res) => {
    res.status(404).render('error', { title: '404Page' });
});

const server = https.createServer({ key, cert }, app);

server.listen(port, () => {
    console.log(`Server running on https://localhost:${port}`);
});
