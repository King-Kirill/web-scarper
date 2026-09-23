
import { page, browser, createPageActions, randomSleep } from './scarper_operations.js'
import { entrance, parse_vacancies } from './page_operations.js';
import { unread_checkbox } from './functions.js';

// initialising scarper methods
const actions = createPageActions(page);

// navigate the page to a URL
await actions.goto('https://hh.ru/');

// press cookie acceptance
await actions.click('button[data-qa="cookies-policy-informer-accept"]');

await page.setViewport({width: 1920, height: 1080})

// auth
await entrance();

// initialize unread messages to show only unread ones
await unread_checkbox();

// vacansy responds
while(browser)
{
    await parse_vacancies();
    await randomSleep();
}

await browser.close();