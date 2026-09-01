// page operations
import dotenv from 'dotenv';
import puppeteer from 'puppeteer';
import { letter_create, answer_question, sleep, getCode, captcha_is_exists, randomSleep, answer_to_unread_messages, resume_update_korzilla, resume_update_perk, resume_update_yandex } from './functions.js';
import fs from 'node:fs/promises';

dotenv.config();

export async function entrance(page)
{
    // once bot is started --> auth user --> press "войти"
    const loginRef = await page.evaluateHandle(() => {
        const spans = [...document.querySelectorAll('span')];
        const target = spans.find(s => s.textContent.trim() === 'Войти');
        return target ? target.closest('a') : null;
    });

    if (loginRef) {
        await loginRef.asElement().click();
    }   else {
        throw new Error('Ref "Войти" was not found');
    }

    await sleep(5000);
    await captcha_is_exists(page);

    await sleep(5000);

    // press "Войти"
    await page.click('button[data-qa="submit-button"]');

    await sleep(5000);
    await captcha_is_exists(page);

    await sleep(5000);

    // select entrance type --> "почта"
    await page.click('input[value="email"]');
    await sleep(5000);
    await captcha_is_exists(page);

    await sleep(5000);

    // enter email
    await page.keyboard.type(process.env.EMAIL);
    await sleep(5000);
    await captcha_is_exists(page);

    await sleep(5000);

    // press "Дальше"
    const nextBtn = await page.evaluateHandle(() => {
        const spans = [...document.querySelectorAll('span')];
        const target = spans.find(s => s.textContent.trim() === 'Дальше');
        return target ? target.closest('button') : null;
    });

    if (nextBtn) {
        await nextBtn.asElement().click();
    } else {
        throw new Error('Button "Дальше" was not found');
    }

    await sleep(5000);
    await captcha_is_exists(page);

    await sleep(60000);

    const code = await getCode();
    await page.keyboard.type(code);

    await sleep(10000);
}

export async function parse_vacancies(page)
{
    try{
        // navigate to page with vacancies list
        await page.goto('https://hh.ru/search/vacancy?resume=5b57bbeeff107a1d170039ed1f76586a724474&hhtmFromLabel=tab_byResume&hhtmFrom=main');
        await sleep(15000);

        // parsing only remote vacancies
        await captcha_is_exists(page);

        await page.click('button[data-qa="header-search-filters-button"]');

        await captcha_is_exists(page);

        await page.click('input[data-qa="search-filter-work_format-value-REMOTE"]');

        await captcha_is_exists(page);

        await page.click('button[data-qa="search-drawer-filters-submit"]');

        await captcha_is_exists(page);

        await sleep(10000);
    
        // getting vacancies refs list
        const links = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'))
            .filter(s => s.textContent.trim() === 'Откликнуться');
    
            const hrefs = new Set();
    
            spans.forEach(span => {
                const parentLink = span.closest('a');
                if (parentLink?.href) {
                    hrefs.add(parentLink.href);
                    return;
                }
        
                const card = span.closest('[data-qa*="vacancy-serp__vacancy"], div[class*="vacancy"]');
                const link = card?.querySelector('a[href*="/vacancy/"]');
                if (link?.href) hrefs.add(link.href);
            });
    
            return Array.from(hrefs);
        });

        let vacancies_counter = 0;

        for(const link of links)
        {
            const url = new URL(link);
            const vacancyId = url.searchParams.get('vacancyId');

            // flag to check if letter was already sent
            let letter_is_send = false;

            const first_link = 'https://hh.ru/vacancy/' + vacancyId + '?from=applicant_recommended&hhtmFrom=main';

            await page.goto(first_link);

            await captcha_is_exists(page);

            await randomSleep();

            const vacancy_data = await page.evaluate(() => {
                // parsing vacancy text and key skills
                const vacancy_text_div = document.querySelector('div[data-qa="vacancy-description"]');

                let vacancy_text = "";

                if(!vacancy_text_div)
                {
                    vacancy_text = "Придумай стандартное сопроводительное письмо, т.к текст вакансии пуст";
                }
                else
                {
                    vacancy_text = vacancy_text_div.textContent.trim();
                }

                const key_skills_divs = Array.from(document.querySelectorAll('li[data-qa="skills-element"]'));

                let key_skills_text = [];

                if(!key_skills_divs)
                {
                    key_skills_text = ['python', 'postgresql', 'ci/cd', 'c++', 'sqlalchemy', 'fastapi', 'react', 'javascript', 'typescript', 'django'];
                }
                else
                {
                    key_skills_text = key_skills_divs.map(li => li.textContent.trim());
                }

                const result = {
                    text: vacancy_text,
                    key_skills: key_skills_text
                };

                return result;
            });

            const vacancy_salary = await page.evaluate(() => {
                // getting vacancy salary
                const salary_selector = document.querySelector('div[data-qa="vacancy-salary"]');

                if(!salary_selector)
                {
                    return "от 200 000 до 250 000 рублей в месяц";
                }

                const salary_text = salary_selector.textContent.trim();

                return salary_text;
            });

            await randomSleep();

            // going to change resume description
            page.goto('https://hh.ru/applicant/profile/me?hhtmFrom=main&hhtmFromLabel=header');

            await sleep(15000);

            await captcha_is_exists(page);

            for(let i = 0; i < 3; i++)
            {
                if(i === 0)
                {
                    const resume_part = await resume_update_korzilla(vacancy_data);

                    // adding to the first part of the resume
                    await page.click('button[data-qa="edit-experience-button-0"]');
                    
                    await sleep(10000);

                    await captcha_is_exists(page);

                    await page.evaluate(() => {
                        const textarea = document.querySelector('textarea[data-qa="resume-editor-experience-description-input"]');
                        if (!textarea) return;

                        const setter = Object.getOwnPropertyDescriptor(
                            HTMLTextAreaElement.prototype,
                            'value'
                        ).set;

                        setter.call(textarea, '');

                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    await page.click('textarea[data-qa="resume-editor-experience-description-input"]');

                    await captcha_is_exists(page);

                    await page.type('textarea[data-qa="resume-editor-experience-description-input"]', resume_part);

                    await sleep(5000);
                    
                    await page.click('button[data-qa="profile-layout-save-button"]');
                }
                else if(i === 1)
                {
                    const resume_part = await resume_update_perk(vacancy_data);
                    // adding to the second part of the resume
                    await page.click('button[data-qa="edit-experience-button-1"]');
                    await sleep(10000);

                    await captcha_is_exists(page);

                    await page.evaluate(() => {
                        const textarea = document.querySelector('textarea[data-qa="resume-editor-experience-description-input"]');
                        if (!textarea) return;

                        const setter = Object.getOwnPropertyDescriptor(
                            HTMLTextAreaElement.prototype,
                            'value'
                        ).set;

                        setter.call(textarea, '');

                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    await page.click('textarea[data-qa="resume-editor-experience-description-input"]');

                    await captcha_is_exists(page);

                    await page.type('textarea[data-qa="resume-editor-experience-description-input"]', resume_part);

                    await sleep(5000);

                    await page.click('button[data-qa="profile-layout-save-button"]');
                }
                else if(i === 2)
                {
                    const resume_part = await resume_update_yandex(vacancy_data);
                    // adding to the third part of the resume
                    await page.click('button[data-qa="edit-experience-button-2"]');
                    await sleep(10000);

                    await captcha_is_exists(page);

                    await page.evaluate(() => {
                        const textarea = document.querySelector('textarea[data-qa="resume-editor-experience-description-input"]');
                        if (!textarea) return;

                        const setter = Object.getOwnPropertyDescriptor(
                            HTMLTextAreaElement.prototype,
                            'value'
                        ).set;

                        setter.call(textarea, '');

                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    await page.click('textarea[data-qa="resume-editor-experience-description-input"]');

                    await captcha_is_exists(page);

                    await page.type('textarea[data-qa="resume-editor-experience-description-input"]', resume_part);

                    await sleep(5000);

                    await page.click('button[data-qa="profile-layout-save-button"]');
                }

                await captcha_is_exists(page);
            }

            const letter = await letter_create(vacancy_data, vacancy_salary);

            await page.goto(link);

            await sleep(15000);

            await captcha_is_exists(page);

            // check if found a banner with relocation warning
            const warningButton = await page.$('button[data-qa="relocation-warning-confirm"]');

            await captcha_is_exists(page);

            if (warningButton) {
                await warningButton.click();
            }

            await captcha_is_exists(page);

            const form_data = await page.evaluate(() => {
                // checking if after click to respond, it forwards us to form page
                const hasForm = document.querySelector('form[name="vacancy_response"]');

                // partitioning questions into hash maps
                const tasks = [];

                if(hasForm)
                {
                    const wrappers = Array.from(document.querySelectorAll('div[data-qa="textarea-wrapper"]'));

                    if(wrappers.length > 0)
                    {
                        const target_letter = wrappers.find(wrapper => {
                            const label = wrapper.querySelector('label');
                            return label && label.textContent.trim() === 'Сопроводительное письмо';});

                        const target_textarea_input = document.querySelector('textarea[data-qa="vacancy-response-popup-form-letter-input"]');

                        if(target_letter)
                        {
                            const textarea = target_letter.querySelector('textarea');

                            if(textarea)
                            {
                                const textarea_class_name = textarea.getAttribute('data-qa');

                                if(textarea_class_name)
                                {
                                    tasks.push(
                                        {
                                            type: "letter",
                                            input: textarea_class_name
                                        }
                                    );
                                }
                            }
                        }
                        else if(target_textarea_input)
                        {
                            const textarea_class_name = target_textarea_input.getAttribute('data-qa');

                            if(textarea_class_name)
                            {
                                tasks.push(
                                    {
                                        type: "letter",
                                        input: textarea_class_name
                                    }
                                );
                            }
                        }
                    }

                    const divs = Array.from(document.querySelectorAll('div[data-qa="task-body"]'));

                    if(divs.length > 0)
                    {
                        divs.map(div => {
                            const question = div.querySelector('div[data-qa="task-question"]');

                            if(question)
                            {
                                const text = question.textContent.trim();

                                if(text)
                                {
                                    const radio_divs = Array.from(div.querySelectorAll('div[data-qa="cell-left-side"]'));

                                    if(radio_divs.length > 0)
                                    {
                                        const radio_buttons = []

                                        for(const radio of radio_divs)
                                        {
                                            const radio_cell = radio.querySelector('input');
                                            const radio_label = radio.querySelector('span[data-qa="cell-text-content"]');

                                            if(radio_cell && radio_label)
                                            {
                                                const radio_cell_value = radio_cell.value;
                                                const radio_label_text= radio_label.textContent.trim();

                                                radio_buttons.push({
                                                    input: radio_cell_value,
                                                    label: radio_label_text
                                                });
                                            }
                                        }

                                        tasks.push(
                                        {
                                            question: text,
                                            type: "radio",
                                            input: radio_buttons
                                        });
                                    }
                                    else
                                    {
                                        const textarea_div = div.querySelector('div[data-qa="textarea-wrapper"]');

                                        if(textarea_div)
                                        {
                                            const textarea = textarea_div.querySelector('textarea');
                                    
                                            if(textarea)
                                            {
                                                const textarea_name = textarea.name;

                                                tasks.push(
                                                    {
                                                        question: text,
                                                        type: "text",
                                                        input: textarea_name
                                                    }
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
                return tasks;
            });

            if(form_data.length > 0)
            {
                for(const task of form_data)
                {
                    if(task.type === "letter")
                    {
                        const textarea_for_letter_exists = await page.$(`textarea[data-qa="${task.input}"]`);

                        if(textarea_for_letter_exists)
                        {
                            await page.click(`textarea[data-qa="${task.input}"]`);

                            await captcha_is_exists(page);

                            await page.keyboard.type(letter);

                            await captcha_is_exists(page);
                
                            letter_is_send = true;
                        }
                    }
                    else{
                        const answer = await answer_question(task, vacancy_salary);

                        if(task.type === "radio")
                        {
                            const values = answer.split(",").map(item => item.trim());

                            for(const value of values)
                            {
                                const click_exists = await page.$(`input[value="${value}"]`);

                                if(click_exists)
                                { 
                                    await page.click(`input[value="${value}"]`);

                                    await captcha_is_exists(page);
                                }
                            }
                        }
                        else if(task.type === "text")
                        {
                            const click_exists = await page.$(`textarea[name="${task.input}"]`);

                            if(click_exists)
                            {
                                await page.click(`textarea[name="${task.input}"]`);

                                await captcha_is_exists(page);

                                await page.keyboard.type(answer);

                                await captcha_is_exists(page);
                            }
                        }
                    }
                }

                // and finally press "Откликнуться"
                const respondBtn = await page.evaluateHandle(() => {
                    const spans = [...document.querySelectorAll('span')];
                    const target = spans.find(s => s.textContent.trim() === 'Откликнуться');
                    return target ? target.closest('button') : null;
                });

                if (respondBtn) {
                    await respondBtn.asElement().click();

                    await captcha_is_exists(page);

                    // check if found a banner with relocation warning
                    const warningButton_inner = await page.$('button[data-qa="relocation-warning-confirm"]');

                    if (warningButton_inner) {
                        await warningButton_inner.click();

                        await captcha_is_exists(page);
                    }
                } else {
                    continue;
                }
            }

            // waiting for "Чат" appears in DOM
            await sleep(15000);

            // if letter wasn't send earlier - sending it through chat message
            if(!letter_is_send)
            {
                const chatBtn = await page.evaluateHandle(() => {
                    const spans = [...document.querySelectorAll('span')];
                    const target = spans.find(s => s.textContent.trim() === 'Чат');
                    return target ? target.closest('button') : null;
                });

                await randomSleep();

                if (chatBtn) {
                    await chatBtn.asElement().click();

                    // waiting for "Добавить сопроводительное" appears in DOM
                    await sleep(10000);

                    await captcha_is_exists(page);

                    // find iframe
                    const iframeHandle = await page.$('iframe.chatik-integration-iframe.chatik-integration-iframe_loaded');

                    if(iframeHandle)
                    {
                        const frame = await iframeHandle.contentFrame();

                        await frame.click('a[data-qa="chatik-chat-message-applicant-action"]');

                        await randomSleep();

                        await captcha_is_exists(page);

                        // find textarea and type letter
                        await frame.evaluate((letter) => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                                textarea.value = letter;
                                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }, letter);

                        await page.keyboard.type(' ');
                
                        await randomSleep();

                        await captcha_is_exists(page);
                
                        await frame.click('button[data-qa="chatik-do-send-message"]');

                        await captcha_is_exists(page);
                    }
                } else {
                    continue;
                }
            }

            if(vacancies_counter >= 5)
            {
                // check unread messages after every 5 vacancies
                await answer_to_unread_messages(page);
                vacancies_counter = 0;
            }
            else{
                vacancies_counter += 1;
            }
        }
    }
    catch(error)
    {
        await fs.appendFile(
            'errors.log',
            `[${new Date().toISOString()}] ${error.stack}\n\n`
        );
    }
}