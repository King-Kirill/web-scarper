// page operations
import dotenv from 'dotenv';
import { page, captcha_exists, randomSleep, createPageActions } from './scarper_operations.js'
import { letter_create, answer_question, sleep, getCode, answer_to_unread_messages, change_resume } from './functions.js';
import fs from 'node:fs/promises';

dotenv.config();

// initialising scarper methods
const actions = createPageActions(page);

export async function entrance()
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

    // nesessary check if captcha exists
    await captcha_exists();

    // press "Войти"
    await actions.click('button[data-qa="submit-button"]');

    // select entrance type --> "почта"
    await actions.click('input[value="email"]');

    // enter email
    await actions.type(process.env.EMAIL);

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

    await captcha_exists();

    //waiting to get the code
    await sleep(60000);

    const code = await getCode();
    await page.keyboard.type(code);
}

// updating resume function
async function update_resume(vacancy_data, vacancy_title)
{
    // getting new resume object
    const response = await change_resume(vacancy_data);

    // converting response
    const [korzilla, vkusvill] = response
        .split("|")
        .map(block => block.trim());
   
    const korzillaTasks = korzilla
        .split(";")
        .map(task => task.trim())
        .filter(Boolean);

    const vkusvillTasks = vkusvill
        .split(";")
        .map(task => task.trim())
        .filter(Boolean);

    // going to resume page
    await actions.goto('https://hh.ru/resume/f06fb6acff110076d80039ed1f5a7366347134?hhtmFrom=main');

    await actions.click('button[data-qa="edit-experience-button-0"]');

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

    await actions.click('textarea[data-qa="resume-editor-experience-description-input"]');

    await fs.appendFile(
        'responds.txt',
        `vacancy title - ${vacancy_title}\n1-st company experience:\n`
    );

    for (let i = 0; i < korzillaTasks.length; i++) {
        await actions.type(`${korzillaTasks[i]}\n\n`);
        await fs.appendFile(
            'responds.txt',
            `${korzillaTasks[i]}\n`
        );
    }

    await actions.click('button[data-qa="profile-layout-save-button"]');

    await actions.goto('https://hh.ru/resume/f06fb6acff110076d80039ed1f5a7366347134?hhtmFrom=main');

    await actions.click('button[data-qa="edit-experience-button-1"]');

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

    await actions.click('textarea[data-qa="resume-editor-experience-description-input"]');

    await fs.appendFile(
        'responds.txt',
        `\n2-nd company experience:\n`
    );

    for (let i = 0; i < vkusvillTasks.length; i++) {
        await actions.type(`${vkusvillTasks[i]}\n\n`);
        await fs.appendFile(
            'responds.txt',
            `${vkusvillTasks[i]}\n`
        );
    }

    await actions.click('button[data-qa="profile-layout-save-button"]');

    // changing title
    await actions.goto('https://hh.ru/resume/edit/f06fb6acff110076d80039ed1f5a7366347134/position');

    await actions.click('input[data-qa="resume-edit-title-suggest"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');

    await actions.type(vacancy_title);

    await actions.click('button[data-qa="resume-partial-edit-save"]');
}

export async function parse_vacancies(vacancies_counter)
{
    try{
        // navigate to page with vacancies list
        await actions.goto('https://hh.ru/search/vacancy?hhtmFromLabel=drawer_filter&hhtmFrom=vacancy_search_list&search_field=name&search_field=company_name&search_field=description&work_format=REMOTE&enable_snippets=true&hhtmSource=vacancy_search_list&hhtmSourceLabel=vacancy_search_list&text=Python+developer');
    
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

        for(const link of links)
        {
            // writing to local file all our responds to vacancies
            await fs.appendFile(
                'responds.txt',
                `------------------------------\nvacancy ref - ${link}\n`
            );

            const url = new URL(link);
            const vacancyId = url.searchParams.get('vacancyId');

            // flag to check if letter was already sent
            let letter_is_send = false;

            const first_link = 'https://hh.ru/vacancy/' + vacancyId + '?from=applicant_recommended&hhtmFrom=main';

            await actions.goto(first_link);

            const vacancy_data = await page.evaluate(() => {
                // parsing vacancy text and key skills
                const vacancy_text_div = document.querySelector('div[data-qa="vacancy-description"]');

                let vacancy_text = "";

                if(!vacancy_text_div)
                {
                    vacancy_text = "Опиши стандартный опыт, т.к текст вакансии пуст";
                }
                else
                {
                    vacancy_text = vacancy_text_div.textContent.trim();
                }

                const key_skills_divs = Array.from(document.querySelectorAll('li[data-qa="skills-element"]'));

                let key_skills_text = [];

                if(!key_skills_divs)
                {
                    key_skills_text = ['python', 'postgresql', 'ci/cd', 'kafka', 'rabbitmq', 'celery', 'sqlalchemy', 'fastapi', 'react', 'javascript', 'typescript', 'django'];
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
                    return "от 180 000 до 250 000 рублей в месяц";
                }

                const salary_text = salary_selector.textContent.trim();

                return salary_text;
            });

            const vacancy_title = await page.evaluate(() => {
                // getting vacancy salary
                const title_selector = document.querySelector('h1[data-qa="vacancy-title"]');

                if(!title_selector)
                {
                    return "Python разработчик";
                }

                const title = title_selector.textContent.trim();

                return title;
            });

            // updating resume
            await update_resume(vacancy_data, vacancy_title);

            await actions.goto(first_link);

            const letter = await letter_create(vacancy_data, vacancy_salary);

            await actions.goto(link);

            // check if found a banner with relocation warning
            const warningButton = await page.$('button[data-qa="relocation-warning-confirm"]');

            if (warningButton) {
                await warningButton.click();
            }

            await captcha_exists();

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
                        // waiting for selector to appear
                        await page.waitForSelector(
                            `textarea[data-qa="${task.input}"]`,
                            { visible: true, timeout: 3000 }
                        );

                        const textarea_for_letter_exists = await page.$(`textarea[data-qa="${task.input}"]`);

                        if(textarea_for_letter_exists)
                        {
                            await actions.click(`textarea[data-qa="${task.input}"]`);

                            await actions.type(letter);
                
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
                                // waiting for selector to appear
                                await page.waitForSelector(
                                    `input[value="${value}"]`,
                                    { visible: true, timeout: 3000 }
                                );

                                const click_exists = await page.$(`input[value="${value}"]`);

                                if(click_exists)
                                { 
                                    await actions.click(`input[value="${value}"]`);
                                }
                            }
                        }
                        else if(task.type === "text")
                        {
                            // waiting for selector to appear
                            await page.waitForSelector(
                                `textarea[name="${task.input}"]`,
                                { visible: true, timeout: 3000 }
                            );

                            const click_exists = await page.$(`textarea[name="${task.input}"]`);

                            if(click_exists)
                            {
                                await actions.click(`textarea[name="${task.input}"]`);

                                await actions.type(answer);
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
                    try{
                        await respondBtn.asElement().click();

                        vacancies_counter += 1;

                        await fs.appendFile(
                            'responds.txt',
                            `------------------------------\n\n\n`
                        );

                        await captcha_exists();

                        // check if found a banner with relocation warning
                        const warningButton_inner = await page.$('button[data-qa="relocation-warning-confirm"]');

                        if (warningButton_inner) {
                            await warningButton_inner.click();

                            await captcha_exists();
                        }
                    }
                    catch(error){
                        await fs.appendFile(
                            'errors.log',
                            `[${new Date().toISOString()}] ${error.stack}\n\n`
                        );
                    }
                } else {
                    continue;
                }
            }

            // if letter wasn't send earlier - sending it through chat message
            if(!letter_is_send)
            {
                const chatBtn = await page.evaluateHandle(() => {
                    const spans = [...document.querySelectorAll('span')];
                    const target = spans.find(s => s.textContent.trim() === 'Чат');
                    return target ? target.closest('button') : null;
                });

                if (chatBtn) {
                    await chatBtn.asElement().click();

                    await captcha_exists();

                    // waiting for selector to appear
                    await page.waitForSelector(
                        'iframe.chatik-integration-iframe.chatik-integration-iframe_loaded',
                        { visible: true, }
                    );
                    
                    // find iframe
                    const iframeHandle = await page.$('iframe.chatik-integration-iframe.chatik-integration-iframe_loaded');

                    if(iframeHandle)
                    {
                        const frame = await iframeHandle.contentFrame();

                        await frame.click('a[data-qa="chatik-chat-message-applicant-action"]');

                        await captcha_exists();

                        // find textarea and type letter
                        await frame.evaluate((letter) => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                                textarea.value = letter;
                                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }, letter);

                        await actions.type(' ');
                
                        await frame.click('button[data-qa="chatik-do-send-message"]');

                        await captcha_exists();
                    }
                } else {
                    continue;
                }
            }

            if(vacancies_counter == 1)
            {
                // check unread messages after every 5 vacancies
                await answer_to_unread_messages(page);
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