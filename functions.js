// api and functions file
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import fs from 'fs';
import puppeteer from 'puppeteer';
import ollama from 'ollama'

dotenv.config();

// groq initialization
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// OPENAI initialization
// const client = new OpenAI({
//   baseURL: 'https://openrouter.ai/api/v1',
//   apiKey: process.env.OPEN_ROUTER_API_KEY
// });

// sleep function
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// random sleep function
export function randomSleep() {
  const ms = Math.random() * 15000 + 5000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// check captcha existence function
export async function captcha_is_exists(page) {
  await sleep(5000);

  const element = await page.$('img[alt="captcha"]');

  if (element) {
    const savePath = 'captcha.png';
    await element.screenshot({ path: savePath });
   
    // groq request to transcribe the captcha
    const imageBuffer = fs.readFileSync(savePath);
    const base64Image = imageBuffer.toString("base64");

    const chatCompletion = await groq.chat.completions.create({
      model: "qwen/qwen3.6-27b",
      messages: [
        {
          role: "system",
          content: "Ты распознаёшь текст с капчи на изображении. Отвечай строго одним словом или словосочетанием, которое видишь на картинке — без пояснений, без кавычек, без дополнительного текста. Если текст не читается — ответь белиберда."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Распознай текст на этой капче."
            },
            {
              type: "image_url",
              image_url: { url: `data:image/png;base64,${base64Image}` }
            }
          ]
        }
      ],
      temperature: 0.6,
      max_completion_tokens: 1024,
      top_p: 0.95,
      reasoning_effort: "none",
      reasoning_format: "hidden",
      stream: false,
      stop: null
    });
    
    const transcribe_captcha = (chatCompletion.choices[0].message.content);

    await page.click('[name="captchaText"]');
    await page.keyboard.type(transcribe_captcha);

    await sleep(5000);

    // press send btn
    const sendBtn = await page.evaluateHandle(() => {
      const spans = [...document.querySelectorAll('span')];
      const target = spans.find(s => s.textContent.trim() === 'Отправить');
      return target ? target.closest('button') : null;
    });

    if (sendBtn) {
      await sendBtn.asElement().click();
    } else {
      throw new Error('Button "Отправить" was not found');
    }

    await sleep(5000);

    captcha_is_exists(page);
  }

  return null;
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
            content: `Ты ${process.env.NAME}, Senior Backend Software Engineer с опытом около 5 лет. Последнее место работы — TravelPerk (команда Bookings & Inventory). Базовый опыт: микросервисная архитектура, REST API и gRPC, PostgreSQL, Redis, Kafka и асинхронная обработка событий, интеграции с внешними API, высоконагруженные распределённые системы, отказоустойчивость (retry, timeout, circuit breaker), CI/CD, Docker, Kubernetes, мониторинг, логирование, тестирование, code review. Твоя задача — написать сопроводительное письмо по тексту вакансии. Не пересказывай вакансию. Максимально адаптируй письмо под требования вакансии. Если в вакансии упоминаются технологии или направления, которых нет в базовом опыте (например ML, LLM, Computer Vision, ClickHouse, Spark, Data Engineering и т.п.), придумай реалистичные задачи, проекты и опыт, которые логично могли существовать в TravelPerk. Не ограничивайся перечислением стандартных обязанностей команды. Допускается расширять опыт кандидата новыми инженерными задачами, если они правдоподобны, соответствуют уровню Senior Backend Engineer, органично вписываются в продукт TravelPerk и помогают показать соответствие вакансии. Вместо перечисления технологий описывай реальные инженерные задачи по схеме: проблема → решение → результат. Используй технологии вакансии естественно, связывая их с выполненными проектами. Если технология встречается в вакансии, постарайся показать практический опыт её использования, придумав реалистичный проект. Не противоречь предыдущему опыту. Новые задачи должны выглядеть как развитие существующего опыта. Стиль: 120–180 слов, профессиональный, уверенный, без списков, без markdown, без объяснений, без фраз вроде "я быстро обучаюсь". Письмо должно выглядеть так, словно его написал опытный инженер. Структура: короткое вступление, затем 2–3 абзаца с опытом, затем короткое заключение. В конце обязательно укажи: Телефон: ${process.env.PHONE}, Email: ${process.env.EMAIL}, Telegram: ${process.env.TELEGRAM}.`          },
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
            content: `Ты опытный программист (5 лет опыта), разработчик программного обеспечения. Твоя задача четко отвечать на вопросы, правильными ответами на вопросы считаются те, которые наиболее сильно выделяют тебя среди других кандидатов и подчеркивают твой многолетний опыт. Ты самостоятельно полностью придумываешь правдоподобный опыт кандидата, который корректно и реалистично вписывается в твое резюме, и адаптируешь его под вопрос. В качестве запроса тебе будет передан json объект, объект содержит ключ - значение. Пройдемся по ключам, из основных менее иммутабельных имеются два: type и question - question это просто вопрос на который надо ответить, формат ответа задается type, type бывает двух видов: radio и text - radio значит, что в поле input у текущего объекта будут указаны варианты ответа, точно также объектами, вариант ответа может быть один, а может быть несколько, input в таком случае будет иметь вид массива с объектами, где каждый отдельный объект представляет из себя ответ и имеет поля в формате ключ - значение, всего ключей бывает два: input и label - label содержит один из ответов на вопрос, в то время как input содержит id селектор этого label поля для нажатия, чтобы отметить нужный ответ, для таких полей корректным ответом будут являться возвращенный или возвращенные селекторы, более ничего писать в ответе на запрос не нужно. Если же type имеет значение text, то ответом на вопрос будет являться текст строго относящийся к вопросу, более ничего писать в ответе на запрос не нужно. Запрещено объяснять выбор. Запрещено писать комментарии. Верни только ответ. Если type=radio: верни только selector (пример ответа: 359141683) либо массив selector-ов (пример ответа: 359141683, 359141684, 359141685). Если type=text: верни только текст ответа. Все ответы должны быть одинакового форматирования без выделений и подчеркиваний, весь текст строго в одном формате (например, выделения по типу **Проект А** или *Задача* - СТРОГО ЗАПРЕЩЕНЫ, разрешено: Проект А, Задача), разрешено только изменение регистра. Если в вопросе требуется предоставить ссылку на гитхаб, или на твои гитхаб проекты, то просто в качестве ответа давай одну эту ссылку: ${process.env.GIT_HUB_REF}. Язык ответа на вопросы ВСЕГДА русский, на английском языке допустимы только названия фреймвороков, сред разработки, языков и.т.д - остальное на русском. На вопросы про желаему зарплату всегда отвечай, что хочешь: ${vacancy_salary} - зарплата ВСЕГДА указывается за месяц. Если в вопросе требуется указать город проживания - указывай Москва, если вопрос требует указать имя - указывай ${process.env.NAME}, если требуется указать номер телефона - указывай ${process.env.PHONE}, если требуется телеграм - указывай ${process.env.TELEGRAM}.`
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

// on purpose participation to prevent strange answers from small language model

// update resume in korzilla part
export async function resume_update_korzilla(vacancy_text)
{
  const chatCompletion = await ollama.chat({
        model: 'gemma3:4b',
        messages: [
          {
            role: "system",
            content: `Ты профессиональный автор технических резюме и Senior Backend Engineer. Тебе передается JSON: {"text":"<описание вакансии>","key_skills":"<ключевые навыки>"}. Твоя задача — написать опыт работы только для заранее указанной компании. Не описывай вакансию. Не пересказывай требования. Не пиши общие фразы. Генерируй только реалистичный опыт работы. Ты работал Fullstack Developer в Korzilla 2 года. Компания разрабатывала внутренние веб-приложения и SaaS-продукты для автоматизации бизнес-процессов. Основной стек: TypeScript, JavaScript, React, Next.js, Node.js, NestJS, PostgreSQL, Redis, Docker, REST API, WebSocket. Придумай реалистичный коммерческий опыт Fullstack-разработчика. Опыт должен содержать задачи как frontend, так и backend. Разрешается писать про React, сложные интерфейсы, оптимизацию производительности, REST API, авторизацию, интеграции, Node.js, NestJS, PostgreSQL, Redis, Docker, WebSocket, CI/CD, рефакторинг и командную разработку. Не повторяй один и тот же глагол более одного раза. Не повторяй одну и ту же технологию более двух раз. Используй разные виды задач: разработка функциональности, интеграции, производительность, качество кода, инфраструктура, тестирование. Используй разнообразные метрики. Не используй одинаковую структуру предложений. Верни только 3 отдельных достижений без заголовков, нумерации, символов списка и пояснений. Каждое достижение должно состоять из одного предложения длиной 10-25 слов.`
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

// update resume in perk part
export async function resume_update_perk(vacancy_text)
{
  const chatCompletion = await ollama.chat({
        model: 'gemma3:4b',
        messages: [
          {
            role: "system",
            content: `Ты профессиональный автор технических резюме и Senior Backend Engineer. Тебе передается JSON: {"text":"<описание вакансии>","key_skills":"<ключевые навыки>"}. Твоя задача — написать опыт работы только для заранее указанной компании. Не описывай вакансию. Не пересказывай требования. Не пиши общие фразы. Генерируй только реалистичный опыт работы. Ты работал Backend Engineer в TravelPerk 3 года в команде Bookings & Inventory. Компания занималась корпоративными путешествиями. Основные задачи команды: интеграция GDS-провайдеров Amadeus, Sabre, HotelBeds и TravelFusion, поиск авиабилетов и отелей, обработка бронирований, кэширование, высоконагруженные распределенные сервисы. Основной стек: Go, PostgreSQL, Redis, Kafka, Docker, Kubernetes, REST API, gRPC. Не используй AI, LangChain, машинное обучение и NLP. Большинство достижений должны быть связаны с интеграциями, поиском, бронированием, производительностью, отказоустойчивостью, кэшированием, обработкой событий и оптимизацией backend-сервисов. Не повторяй один и тот же глагол более одного раза. Не повторяй одну технологию более двух раз. Используй разные инженерные задачи и разнообразные метрики. Не используй одинаковую структуру предложений. Верни только 3 отдельных достижений без заголовков, нумерации, символов списка и пояснений. Каждое достижение должно состоять из одного предложения длиной 10-25 слов.`
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

// update resume in yandex part
export async function resume_update_yandex(vacancy_text)
{
  const chatCompletion = await ollama.chat({
        model: 'gemma3:4b',
        messages: [
          {
            role: "system",
            content: `Ты профессиональный автор технических резюме и Senior Backend Engineer. Тебе передается JSON: {"text":"<описание вакансии>","key_skills":"<ключевые навыки>"}. Твоя задача — написать опыт работы только для заранее указанной компании. Не описывай вакансию. Не пересказывай требования. Не пиши общие фразы. Генерируй только реалистичный опыт работы. Ты проходил стажировку Backend Developer в Яндексе около 6 месяцев. Ты работал под руководством наставника и выполнял задачи уровня Junior Backend Developer. Ты не проектировал архитектуру системы, не принимал стратегических решений и не руководил командой. Основной стек: Go, Python, PostgreSQL, Redis, Kafka, Docker, gRPC. Типичные задачи: доработка небольших backend-сервисов, исправление дефектов, разработка отдельных API, написание unit-тестов, оптимизация SQL-запросов, интеграция внутренних сервисов, мониторинг, логирование, документация, небольшие задачи по производительности и рефакторингу. Достижения должны быть реалистичными для стажера и не выглядеть как опыт Senior-разработчика. Не повторяй один и тот же глагол более одного раза. Используй разные задачи и небольшие правдоподобные результаты. Верни только 2 отдельных достижения без заголовков, нумерации, символов списка и пояснений. Каждое достижение должно состоять из одного предложения длиной 10-25 слов.`
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

// answering to questions in hh chat
export async function answer_questions_chat(messages) {
  const system_message = {
    role: 'system',
    content: `Ты опытный программист (5 лет опыта работы), разработчик программного обеспечения. Ты самостоятельно полностью придумываешь правдоподобный опыт кандидата, который корректно и реалистично вписывается в твой опыт mid+/senior backend engineer, и адаптируешь его под вопрос. Твоя задача отвечать на вопросы работодателя и давать максимально релевантные ответы, демонстрирующие тебя как опытного и квалифицированного специалиста, тебе в формате сообщений будут переданы твои ответы как assistant и ответы/вопросы работодателя как user, твоя задача проанализировать полученные сообщения, выявить сообщения от пользователя user на которые не было дано ответа, и вернуть текст ответа на одно или несколько сообщений от user. Ты отвечаешь ТОЛЬКО НА СООБЩЕНИЯ USER НА КОТОРЫЕ НЕ БЫЛО ДАНО ОТВЕТА. Ответы на вопросы работодателя должны быть осмысленными, но простыми и не особенно длинными, старайся не выходить за пределы 50-60 слов за один вопрос. Любое форматирование текста под запретом, за исключением регистра, в остальном никаких выделений, никаких буллет поинтов, строгое оформление как при обычном текстовом сообщении в мессенджере. Если в одном или нескольких вопросах будет требование/просьба предоставить твои контакты - указывай: город проживания - указывай Москва, если вопрос требует указать имя - указывай ${process.env.NAME}, если требуется указать номер телефона - указывай ${process.env.PHONE}, если требуется телеграм - указывай ${process.env.TELEGRAM}. В качестве ответа при обращении возвращай только текст ответа на вопрос/вопросы, без комментариев, без пояснений, без лишних знаков. Также при ответе на вопросы учитывай контекст и прошлые ответы. Если вопрос требует указать желаемую заработную плату указывай: предпочтительная вилка по зп от 200 000 до 250 000 рублей или 3.000$ в месяц. Если в вопросе не содержится явной просьбы указать желаему заработную плату - указывать ее ЗАПРЕЩЕНО. ТОЛЬКО если в сообщении предлагается назначить собеседование или имеется просьба позвонить - в качестве ответа нужно вернуть: "success_vacancy"`
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
    const chatik_btn = await page.$('button[data-qa="chatikActivator-button"]');

    if (chatik_btn) {
      await chatik_btn.asElement().click();

      await sleep(10000);

      // find iframe
      const iframeHandle = await page.$('iframe.chatik-integration-iframe.chatik-integration-iframe_loaded');

      if(iframeHandle)
      {
        const frame = await iframeHandle.contentFrame();

        let back_btn = await frame.$('button[data-qa="chatik-back-to-chats-button"]');

        if(back_btn)
        {
          await back_btn.asElement().click();
          await randomSleep();
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
    await page.goto('https://hh.ru/search/vacancy?resume=5b57bbeeff107a1d170039ed1f76586a724474&hhtmFromLabel=tab_byResume&hhtmFrom=main');
    await sleep(20000);

    await captcha_is_exists(page);

    const chatik_btn = await page.$('button[data-qa="chatikActivator-button"]');

    if (chatik_btn) {
      await chatik_btn.asElement().click();

      await sleep(10000);

      await captcha_is_exists(page);

      // find iframe
      const iframeHandle = await page.$('iframe.chatik-integration-iframe.chatik-integration-iframe_loaded');

      if(iframeHandle)
      {
        const frame = await iframeHandle.contentFrame();

        let back_btn = await frame.$('button[data-qa="chatik-back-to-chats-button"]');

        if(back_btn)
        {
          await back_btn.asElement().click();
          await randomSleep();

          await captcha_is_exists(page);
        }

        // parsing chats with unread messages
        const links = (await frame.$$('a[id^="chat-cell-"]')).slice(0, 10);

        const hrefs = await Promise.all(
          links.map(link => link.evaluate(el => el.href))
        );

        for (const link of hrefs) {
          // going to chat page
          await page.goto(link);

          await sleep(20000);

          await captcha_is_exists(page);

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
            await randomSleep();

            // find textarea and type letter
            await page.evaluate((ai_answer) => {
              const textarea = document.querySelector('textarea[data-qa="chatik-new-message-text"]');
              if (textarea) {
                textarea.value = ai_answer;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }, ai_answer);

            await page.keyboard.type(' ');
                
            await randomSleep();

            await captcha_is_exists(page);
                
            await page.click('button[data-qa="chatik-do-send-message"]');
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