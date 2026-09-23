// api and functions file
import ollama from 'ollama'
import { page, createPageActions, randomSleep, captcha_exists } from './scarper_operations.js'

// initialising scarper methods
const actions = createPageActions(page);

// sleep function
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// getting code from email
export async function getCode() {
  const res = await fetch("http://localhost:8000/get-code");

  if(res.status === 200)
  {
    const data = await res.json();
    return String(data.content);
  }
  else
  {
    await sleep(5000);
    return getCode();
  }
}

// create letter
export async function letter_create(vacancy_text) {
    const chatCompletion = await ollama.chat({
        model: 'gemma3:4b',
        messages: [
          {
            role: "system",
            content: `Ты ${process.env.NAME}, Middle Backend Engineer с опытом около 3 и более лет. Последнее место работы — Korzilla (Fullstack engineer), время работы: год и 2 месяца. Базовый опыт на этой позиции: Fullstack-разработка на Python и JavaScript/TypeScript, FastAPI и Django, React, REST API, PostgreSQL, Redis, SQLAlchemy, Celery, Docker и CI/CD, разработка frontend и backend частей приложений, административных панелей, интеграций с внешними API и ERP-системами, авторизация и RBAC, асинхронная обработка задач, оптимизация запросов и API, тестирование, логирование, deployment и сопровождение приложений. Позапрошлое место работы - ВкусВилл (Backend engineer), время работы: 2 года и 10 месяцев. Базовый опыт на этой позиции: микросервисная архитектура, REST API и gRPC, PostgreSQL, Redis, Kafka и асинхронная обработка событий, интеграции с внешними API, высоконагруженные распределённые системы, отказоустойчивость (retry, timeout, circuit breaker), CI/CD, Docker, Kubernetes, мониторинг, логирование, тестирование, code review.микросервисная архитектура, REST API и gRPC, PostgreSQL, Redis, Kafka и асинхронная обработка событий, интеграции с внешними API, высоконагруженные распределённые системы, отказоустойчивость (retry, timeout, circuit breaker), CI/CD, Docker, Kubernetes, мониторинг, логирование, тестирование, code review. Твоя задача — написать сопроводительное письмо по тексту вакансии. Не пересказывай вакансию. Максимально АДАПТИРУЙ ПИСЬМО под требования вакансии. Если в вакансии упоминаются технологии или направления, которых нет в базовом опыте (например ML, LLM, Computer Vision, ClickHouse, Spark, Data Engineering и т.п.), придумай реалистичные задачи, проекты и опыт, которые логично могли существовать в ВкусВилл или Korzilla. Не ограничивайся перечислением стандартных обязанностей команды. Допускается расширять опыт кандидата новыми инженерными задачами, если они правдоподобны, соответствуют уровню Middle/Senior Backend Engineer, органично вписываются в продукт ВкусВилл/Korzilla и помогают показать соответствие вакансии. Вместо перечисления технологий описывай реальные инженерные задачи по схеме: проблема → решение → результат. Используй технологии вакансии естественно, связывая их с выполненными проектами. Если технология встречается в вакансии, постарайся показать практический опыт её использования, придумав реалистичный проект. Не противоречь предыдущему опыту. Новые задачи должны выглядеть как развитие существующего опыта. Стиль: 120–180 слов, профессиональный, уверенный, без списков, без markdown, без объяснений, без фраз вроде "я быстро обучаюсь". Письмо должно выглядеть так, словно его написал опытный инженер. Структура: короткое вступление, затем 2–3 абзаца с опытом, затем короткое заключение. В конце обязательно укажи: Телефон: ${process.env.PHONE}, Email: ${process.env.EMAIL}, Telegram: ${process.env.TELEGRAM}.`
          },
          {
            role: "user",
            content: JSON.stringify(vacancy_text)
          }
        ],
        stream: false
    });
    
    const ai_answer = chatCompletion.message.content;

  return ai_answer;
}

// answering to questions in hh form
export async function answer_question(task, vacancy_salary) {
    const chatCompletion = await ollama.chat({
        model: 'gemma3:4b',
        messages: [
          {
            role: "system",
            content: `Ты опытный программист (3 года опыта), разработчик программного обеспечения. Твоя задача четко отвечать на вопросы, правильными ответами на вопросы считаются те, которые наиболее сильно выделяют тебя среди других кандидатов и подчеркивают твой многолетний опыт. Ты самостоятельно полностью придумываешь правдоподобный опыт кандидата, который корректно и реалистично вписывается в твое резюме, и адаптируешь его под вопрос. В качестве запроса тебе будет передан json объект, объект содержит ключ - значение. Пройдемся по ключам, из основных менее иммутабельных имеются два: type и question - question это просто вопрос на который надо ответить, формат ответа задается type, type бывает двух видов: radio и text - radio значит, что в поле input у текущего объекта будут указаны варианты ответа, точно также объектами, вариант ответа может быть один, а может быть несколько, input в таком случае будет иметь вид массива с объектами, где каждый отдельный объект представляет из себя ответ и имеет поля в формате ключ - значение, всего ключей бывает два: input и label - label содержит один из ответов на вопрос, в то время как input содержит id селектор этого label поля для нажатия, чтобы отметить нужный ответ, для таких полей корректным ответом будут являться возвращенный или возвращенные селекторы, более ничего писать в ответе на запрос не нужно. Если же type имеет значение text, то ответом на вопрос будет являться текст строго относящийся к вопросу, более ничего писать в ответе на запрос не нужно. Запрещено объяснять выбор. Запрещено писать комментарии. Верни только ответ. Если type=radio: верни только selector (пример ответа: 359141683) либо массив selector-ов (пример ответа: 359141683, 359141684, 359141685). Если type=text: верни только текст ответа. Все ответы должны быть одинакового форматирования без выделений и подчеркиваний, весь текст строго в одном формате (например, выделения по типу **Проект А** или *Задача* - СТРОГО ЗАПРЕЩЕНЫ, разрешено: Проект А, Задача), разрешено только изменение регистра. Если в вопросе требуется предоставить ссылку на гитхаб, или на твои гитхаб проекты, то просто в качестве ответа давай одну эту ссылку: ${process.env.GIT_HUB_REF}. Язык ответа на вопросы ВСЕГДА русский, на английском языке допустимы только названия фреймвороков, сред разработки, языков и.т.д - остальное на русском. На вопросы про желаему зарплату всегда отвечай, что хочешь: ${vacancy_salary} - зарплата ВСЕГДА указывается за месяц. Если в вопросе требуется указать город проживания - указывай Москва, если вопрос требует указать имя - указывай ${process.env.NAME}, если требуется указать номер телефона - указывай ${process.env.PHONE}, если требуется телеграм - указывай ${process.env.TELEGRAM}.`
          },
          {
            role: "user",
            content: JSON.stringify(task)
          }
        ],
        stream: false
    });
    
    const ai_answer = chatCompletion.message.content;

  return ai_answer;
}

// answering to questions in hh chat
export async function answer_questions_chat(messages) {
  const system_message = {
    role: 'system',
    content: `Ты опытный программист (3 года опыта работы), разработчик программного обеспечения. Ты самостоятельно полностью придумываешь правдоподобный опыт кандидата, который корректно и реалистично вписывается в твой опыт mid+/senior backend engineer, и адаптируешь его под вопрос. Твоя задача отвечать на вопросы работодателя и давать максимально релевантные ответы, демонстрирующие тебя как опытного и квалифицированного специалиста, тебе в формате сообщений будут переданы твои ответы как assistant и ответы/вопросы работодателя как user, твоя задача проанализировать полученные сообщения, выявить сообщения от пользователя user на которые не было дано ответа, и вернуть текст ответа на одно или несколько сообщений от user. Ты отвечаешь ТОЛЬКО НА СООБЩЕНИЯ USER НА КОТОРЫЕ НЕ БЫЛО ДАНО ОТВЕТА. Ответы на вопросы работодателя должны быть осмысленными, но простыми и не особенно длинными, старайся не выходить за пределы 50-60 слов за один вопрос. Любое форматирование текста под запретом, за исключением регистра, в остальном никаких выделений, никаких буллет поинтов, строгое оформление как при обычном текстовом сообщении в мессенджере. Если в одном или нескольких вопросах будет требование/просьба предоставить твои контакты - указывай: город проживания - указывай Москва, если вопрос требует указать имя - указывай ${process.env.NAME}, если требуется указать номер телефона - указывай ${process.env.PHONE}, если требуется телеграм - указывай ${process.env.TELEGRAM}. В качестве ответа при обращении возвращай только текст ответа на вопрос/вопросы, без комментариев, без пояснений, без лишних знаков. Также при ответе на вопросы учитывай контекст и прошлые ответы. Если вопрос требует указать желаемую заработную плату указывай: предпочтительная вилка по зп от 150 000 до 200 000 рублей или 2.000$ в месяц. Если в вопросе не содержится явной просьбы указать желаему заработную плату - указывать ее ЗАПРЕЩЕНО. ТОЛЬКО если в сообщении предлагается написать hr или назначено собеседование - в качестве ответа нужно вернуть: "success_vacancy"`
  };
  
  messages.unshift(system_message);

    const chatCompletion = await ollama.chat({
        model: 'gemma3:4b',
        messages: messages,
        stream: false
    });
    
    const ai_answer = chatCompletion.message.content;

  return ai_answer;
}

// press checkbox to read only unread messages
export async function unread_checkbox(page)
{
  try{
    // waiting for selector to appear
    await page.waitForSelector(
      'button[data-qa="chatikActivator-button"]',
      { visible: true, timeout: 3000 }
    );

    const chatik_btn = await page.$('button[data-qa="chatikActivator-button"]');

    if (chatik_btn) {
      await chatik_btn.asElement().click();

      await randomSleep();

      // waiting for selector to appear
      await page.waitForSelector(
        'iframe.chatik-integration-iframe.chatik-integration-iframe_loaded',
        { visible: true, timeout: 3000 }
      );

      // find iframe
      const iframeHandle = await page.$('iframe.chatik-integration-iframe.chatik-integration-iframe_loaded');

      if(iframeHandle)
      {
        const frame = await iframeHandle.contentFrame();

        let back_btn = await frame.$('button[data-qa="chatik-back-to-chats-button"]');

        if(back_btn)
        {
          await back_btn.asElement().click();
          await captcha_exists();
        }

        const only_unread_btn = await frame.$('input[data-qa="chatik-checkbox-only-unread"]');

        if(only_unread_btn)
        {
          await only_unread_btn.asElement().click();
        }
      }
    }
  }
  catch(error)
  {
    console.log(error);
  }
}

// answering to unread messages
export async function answer_to_unread_messages(page)
{
  try{
    await actions.goto('https://hh.ru/search/vacancy?resume=5b57bbeeff107a1d170039ed1f76586a724474&hhtmFromLabel=tab_byResume&hhtmFrom=main');

    // waiting for selector to appear
    await page.waitForSelector(
      'button[data-qa="chatikActivator-button"]',
      { visible: true, timeout: 3000 }
    );
    
    const chatik_btn = await page.$('button[data-qa="chatikActivator-button"]');

    if (chatik_btn) {
      await chatik_btn.asElement().click();

      await captcha_exists();

      // waiting for selector to appear
      await page.waitForSelector(
        'iframe.chatik-integration-iframe.chatik-integration-iframe_loaded',
        { visible: true, timeout: 3000 }
      );
      
      // find iframe
      const iframeHandle = await page.$('iframe.chatik-integration-iframe.chatik-integration-iframe_loaded');

      if(iframeHandle)
      {
        const frame = await iframeHandle.contentFrame();

        let back_btn = await frame.$('button[data-qa="chatik-back-to-chats-button"]');

        if(back_btn)
        {
          await back_btn.asElement().click();
          await captcha_exists();
        }

        // parsing chats with unread messages
        const links = (await frame.$$('a[id^="chat-cell-"]')).slice(0, 10);

        const hrefs = await Promise.all(
          links.map(link => link.evaluate(el => el.href))
        );

        for (const link of hrefs) {
          // going to chat page
          await actions.goto(link);

          // waiting for selector to appear
          await page.waitForSelector(
            'textarea',
            { visible: true, timeout: 3000 }
          );

          const textarea_obj = await page.$('textarea');

          if (!textarea_obj) {
            continue;
          }

          const chat_messages = [];

          const message_classes = await page.evaluate(() => {
            return [...document.querySelectorAll('span[data-qa="chat-bubble-text"]')]
            .map(span => span.closest("div").getAttribute("data-qa"))
          });

          for(const message_class of message_classes)
          {
            const chat_obj = await page.evaluate((message_class) => {
              const class_name = document.querySelector(`div[data-qa="${message_class}"]`);

              if(class_name)
              {
                const closest_div = class_name.closest("div").parentElement.className;

                const message_element = document.querySelector(`div[data-qa="${message_class}"]`);

                if(message_element)
                {
                  const message_text = message_element.querySelector(`span[data-qa="chat-bubble-text"]`).textContent.trim();

                  let role = "assistant";

                  if (
                    closest_div.includes("left") ||
                    closest_div.includes("bot")
                  ) {
                    role = "user";
                  }

                  const obj_to_return = {
                    role: role,
                    content: message_text,
                  };

                  return obj_to_return; 
                }
              }
              else
              {
                return false;
              }
            }, message_class);

            if(chat_obj)
            {
              chat_messages.push(chat_obj);
            }
          }

          // sending chat messages to ai agent
          const ai_answer = await answer_questions_chat(chat_messages);

          if(ai_answer === "success_vacancy")
          {
            await fetch("http://localhost:8000/send-vacancy", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                url: link
              })
            });
          }
          else
          {
            // find textarea and type letter
            await page.evaluate((ai_answer) => {
              const textarea = document.querySelector('textarea[data-qa="chatik-new-message-text"]');
              if (textarea) {
                textarea.value = ai_answer;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }, ai_answer);

            await actions.type(' ');
                
            await actions.click('button[data-qa="chatik-do-send-message"]');
          }
        }
      }
    }
  }
  catch(error)
  {
    console.log(error);
  }
}