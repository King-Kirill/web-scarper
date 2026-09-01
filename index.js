import puppeteer from 'puppeteer';
import { entrance, parse_vacancies } from './operations.js';
import { sleep, randomSleep, unread_checkbox, answer_to_unread_messages } from './functions.js';
import fs from 'fs';

// Launching the browser and open a new blank page
const browser = await puppeteer.launch({headless: false, timeout: 3000});
const page = await browser.newPage();

// navigate the page to a URL
await page.goto('https://hh.ru/');

await sleep(10000); // 10 seconds pause

// press cookie acceptance
await page.click('button[data-qa="cookies-policy-informer-accept"]');

await sleep(10000);

// setting screen size
await page.setViewport({width: 1920, height: 1080});

await sleep(5000); // 5 seconds pause

// auth
await entrance(page);

await sleep(10000);

// initialize unread messages to show only unread ones
await unread_checkbox(page);

await sleep(5000); // 5 seconds pause

// vacansy responds
while(browser)
{
    await parse_vacancies(page);
    await randomSleep();
}

await sleep(30000);

await browser.close();