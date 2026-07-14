const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require( 'puppeteer-extra');
const StealthPlugin = require( 'puppeteer-extra-plugin-stealth');
const AdBlockerPlugiin = require( 'puppeteer-extra-plugin-adblocker');
const {CookieJar} = require('tough-cookie');
const {wrapper} = require('axios-cookiejar-support');
const app = express();
const PORT = 3000;

// uses puppeteer plugins to hide from bot detection
puppeteer.use(StealthPlugin);
puppeteer.use(AdBlockerPlugiin({ blockTrackers: true}));

// get movie data from letterboxd
app.get('/movies/:username', async (req, res) => {
    const username = req.params.username;
    let url  = `https://letterboxd.com/${username}/films/`

    // opening a browser instance to goto webpage to parse data
    const browser = await puppeteer.launch({headless: "false" });
    const page = await browser.newPage();

    await page.goto(url);
    await page.waitForSelector('li.griditem'); // waiting for the data to load
    
    const movies = []; // stores the data

    // cookie data - might not need anymore
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    
    let nextPage = true; // flag for the while loop

    try {
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

                // both are span classes
                // 'rating -micro -darker rated-6' class name to get start ranking??
                // 'like liked-micro has-icon icon-liked icon-16' class name to get heart??

                // adds to the array to store data
                movies.push({ title, slug, link });
            });

                    
            let cookies = await jar.getCookies(url);

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

        await browser.close();
    
    } catch(error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch movies'});
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});