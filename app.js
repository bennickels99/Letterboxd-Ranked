const express = require('express');
const cheerio = require('cheerio');
const puppeteer = require( 'puppeteer-extra');
const StealthPlugin = require( 'puppeteer-extra-plugin-stealth');
const AdBlockerPlugiin = require( 'puppeteer-extra-plugin-adblocker');
const { executablePath } = require('puppeteer-core');
const fs = require('fs');
const app = express();
const PORT = 3000;

// uses puppeteer plugins to hide from bot detection
puppeteer.use(StealthPlugin());
puppeteer.use(AdBlockerPlugiin({ blockTrackers: true}));

// get movie data from letterboxd
app.get('/movies/:username', async (req, res) => {
    let browser;
    
    try {
        const username = req.params.username;
        let url  = `https://letterboxd.com/${username}/films/`

        // opening a browser instance to goto webpage to parse data
        browser = await puppeteer.launch({
            headless: false, // set to false because fails when set to true, will try to fix later
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']});
        const page = await browser.newPage();

        await page.goto(url);
        await page.waitForSelector('li.griditem'); // waiting for the data to load
        
        const movies = []; // stores the data
        
        let nextPage = true; // flag for the while loop

        while(nextPage){
            // finds the next button to goto the next page
            const nextPageLink = await page.$('.next');

            // grabs all the html data
            const pageData = await page.evaluate(() => {
            return {html: document.documentElement.innerHTML};
            })

            // stores the data into cheerio
            const $ = cheerio.load(pageData.html);
            console.log('griditem count:', $('li.griditem').length);

            // parses the data using each css selector
            $('li.griditem').each((i, el) => {
                const div = $(el).find('div.react-component');
                const title = div.attr('data-item-full-display-name');
                const slug = div.attr('data-item-slug');
                const link = div.attr('data-item-link');

                const p = $(el).find('p.poster-viewingdata');
                const ratingString = p.children().first().attr('class');
                const rating = ratingString.at(-1);
                let liked;
                if($(el).find('span.icon').length > 0) {
                    liked = true;
                }else{
                    liked = false;
                }

                // 0 = 10, 1 = .5, 2 = 1, 3 = 1.5, 4 = 2 ...

                // adds to the array to store data
                movies.push({ title, slug, link, rating, liked });
            });


            // exit condition - if no next button change flag and end loop
            if($('.paginate-nextprev.paginate-disabled').find('.next').length > 0){
                console.log('No more pages. Exiting.');
                nextPage = false;
            } else {
                // click to goto next page
                await nextPageLink.click();
                // wait for it to load
                await page.waitForNavigation();
                // wait for the elements to load
                await page.waitForSelector('li.griditem');

            }
        }

        res.json(movies);

        // storing the data into a json file
        const moviesString = JSON.stringify(movies, null, 2);

        fs.writeFile('userMovies.json', moviesString, 'utf8', (err) => {
            if(err) {
                console.error("An error occurred while writing to the file: ", err);
                return;
            }
            console.log("JSON file has been saved successfully");
        });
    
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movies'});
    } finally{
        await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});