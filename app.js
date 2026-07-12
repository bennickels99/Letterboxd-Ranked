const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const {CookieJar} = require('tough-cookie');
const {wrapper} = require('axios-cookiejar-support');
const app = express();
const PORT = 3000;


// get movie data from letterboxd
app.get('/movies/:username', async (req, res) => {
    const username = req.params.username;
    //let num = 1;
    //let pageNum = num.toString();
    //const pageNum = req.params.pageNum;
    let url  = `https://letterboxd.com/${username}/films/`
    
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));

    let num = 1;
    const movies = [];

    let nextPage = false;
    let isData  = true;
    
    try {
        do { 
            let pageNum = num.toString();
            isResponse = false;
            
            if(nextPage){
                url = `https://letterboxd.com/${username}/films/page/${pageNum}/`
            }
            
            const response = await client.get(url, {
                headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const $ = cheerio.load(response.data);
            console.log('griditem count:', $('li.griditem').length);

            $('li.griditem').each((i, el) => {
                const div = $(el).find('div.react-component');
                const title = div.attr('data-item-full-display-name');
                const slug = div.attr('data-item-slug');
                const link = div.attr('data-item-link');

                // both are span classes
                // 'rating -micro -darker rated-6' class name to get start ranking??
                // 'like liked-micro has-icon icon-liked icon-16' class name to get heart??

                movies.push({ title, slug, link });
            });

            nextPage = true;
            num += 1;
            if($('li.griditem').length == 0){
                isData = false;
            }
            
            let cookies = await jar.getCookies(url);
            await new Promise (r => setTimeout(r, 5000));

        } while(isData) 
        
        res.json(movies);
    
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movies'});
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});