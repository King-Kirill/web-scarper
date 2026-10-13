
import { page, browser, createPageActions, randomSleep } from './scarper_operations.js'
import { entrance, parse_vacancies } from './page_operations.js';
import { unread_checkbox, answer_to_unread_messages, sleep } from './functions.js';

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
await unread_checkbox(page);

// vacansy responds
let vacancies_counter = 0;
let drop_counter = false;

while(browser)
{
    if(vacancies_counter >= 195)
    {
        // timer, cuz hh got limits for 200 responds per day
        setTimeout(() => {
            drop_counter = true;
        }, 24 * 60 * 60 * 1000);
        
        await answer_to_unread_messages(page);
        await sleep(60 * 10000);
        await randomSleep();

        if(drop_counter)
        {
            vacancies_counter = 0;
            drop_counter = false;
        }
    }
    else
    {
        await parse_vacancies(vacancies_counter);
        await randomSleep();
    }
}

await browser.close();