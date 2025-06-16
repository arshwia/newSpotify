import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import morgan from 'morgan';
import ytSearch from 'yt-search';
import ytdl from 'ytdl-core';


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

app.get('/youtube-search', async (req, res) => {
	const query = req.query.q;
	if (!query) {
		return res.status(400).send("Query parameter 'q' is required");
	}

	try {
		const results = await ytSearch(query);
		if (results && results.videos && results.videos.length > 0) {
			const video = results.videos[0];
			res.json({
				title: video.title,
				url: video.url,
				duration: video.timestamp,
				views: video.views
			});
		} else {
			res.status(404).send("No videos found");
		}
	} catch (error) {
		console.error("YouTube search error:", error);
		res.status(500).render("error", { title:"404Page" });
	}
});

app.get('/download', async (req, res) => {
	const videoUrl = req.query.url;
	if (!videoUrl) {
		return res.status(400).send('Missing video URL');
	}

	try {
		const info = await ytdl.getInfo(videoUrl);
		const title = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, '-'); // حذف کاراکترهای مشکل‌ساز
		res.header('Content-Disposition', `attachment; filename="${title}.mp3"`);

		ytdl(videoUrl, {
			filter: 'audioonly',
			quality: 'highestaudio',
		}).pipe(res);
	} catch (error) {
		console.error('Download error:', error);
		res.status(500).render("error", { title:"404Page" });
	}
});

app.use((req, res) => {
	res.status(404).render("error", { title:"404Page" })
})