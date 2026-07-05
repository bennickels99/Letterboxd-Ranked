const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = 3000;


// get movie data from letterboxd
app.get('/movies/:username', async (req, res) => {
    const username = req.params.username;
    const url  = `https://letterboxd.com/${username}/films/`
    
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        console.log(response.data);

        const movies = [];

        $('li.poster-container').each((i, el) => {
            const div = $(el).find('div.react-component');
            const title = div.attr('data-item-full-display-name');
            const slug = div.attr('data-item-slug');
            const link = div.attr('data-item-link');

            movies.push({ title, slug, link });
        });

        res.json(movies);
    
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movies'});
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});