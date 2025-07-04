import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { title } from 'process';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

app.use(morgan('dev'));

let accessToken = "";

app.use(express.static(path.join(__dirname, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
})

app.get("/", (req, res) => {
	res.render("login", { title: "login" })
})

app.get("/login", (req, res) => {

	const queryParams = new URLSearchParams({
		response_type: "code",
		client_id: process.env.SPOTIFY_CLIENT_ID,
		scope: 'playlist-read-private user-library-read',
		redirect_uri: process.env.REDIRECT_URI
	});

	res.redirect(`https://accounts.spotify.com/authorize?${queryParams.toString()}`)
})

app.get("/about", (req, res) => {
	res.render("about", { title: "about" })
})

app.get("/callback", async (req, res) => {
	const code = req.query.code;

	if (!code) {
		return res.status(400).send("No code provided")
	}

	try {
		const credentials = Buffer
			.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`)
			.toString('base64')

		const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: process.env.REDIRECT_URI
		}), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${credentials}`
			}
		})

		accessToken = response.data.access_token;

		res.render("playlists-link", { title: "playlists-link" })
	} catch (error) {
		console.error("Error during callback:", error)
		res.status(500).render("error", { title:"404Page" })
	}
})

app.get("/playlists", async (req, res) => {
	try {
		const response = await axios.get("https://api.spotify.com/v1/me/playlists", {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		})

		const playlists = response.data.items
		res.render("playlists", { title: "playlist-ul", playlists })
	} catch (error) {
		console.error("Error during callback:", error)
		res.status(500).render("error", { title:"404Page" });
	}
})

app.get("/playlist/:id/tracks", async (req, res) => {
	const playlistId = req.params.id;
	const limit = 100;
	let offset = 0;
	let allTracks = [];
	let more = true;

	try {
		while (more) {
			const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
				headers: {
					Authorization: `Bearer ${accessToken}`
				},
				params: {
					limit,
					offset
				}
			});

			allTracks.push(...response.data.items);

			if (response.data.items.length < limit) {
				more = false;
			} else {
				offset += limit;
			}
		}

		res.render("tracks", { title: "track list", tracks: allTracks });
	} catch (error) {
		console.error("Error fetching tracks:", error);
		res.status(500).render("error", { title:"404Page" });
	}
});

app.get('/playlist-embed/:playlistId', async (req, res) => {
  const playlistId = req.params.playlistId;
  const limit = 100;
  let offset = 0;
  let allTracks = [];
  let more = true;

  try {
    while (more) {
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit, offset }
      });

      allTracks.push(...response.data.items.map(item => item.track));

      if (response.data.items.length < limit) {
        more = false;
      } else {
        offset += limit;
      }
    }

    res.render('playlistEmbed', { tracks: allTracks, title: "Playlist Embed" });
  } catch (error) {
    console.error("Error fetching playlist tracks for embed:", error);
    res.status(500).render("error", { title: "404Page" });
  }
});

app.use((req, res) => {
	res.status(404).render("error", { title:"404Page" })
})