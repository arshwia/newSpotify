import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';

import spotifyRouter from './routes/spotify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(morgan('dev'));

app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
})

app.use("/", spotifyRouter);

app.use((req, res) => {
	res.status(404).render("error", { title:"404Page" })
})