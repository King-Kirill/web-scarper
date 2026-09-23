import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';

dotenv.config();

// Launching the browser and open a new blank page
export const browser = await puppeteer.launch({headless: false, timeout: 3000});
export const page = await browser.newPage();
page.setDefaultNavigationTimeout(90000); //setting bigger timeout

// groq initialization
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// random sleep function
export function randomSleep() {
    const ms = Math.random() * 2000 + 3000;

    return new Promise(resolve => setTimeout(resolve, ms));
}

// check captcha existence function
export async function captcha_exists() {
  await randomSleep();

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

    await captcha_exists();
  }

  return null;
}

// overriding regular base scarper functions as monkey patches
function page_click(page) {
    const orirginalClickBind = page.click.bind(page);

    return async function click(selector, options){
        await page.waitForSelector(selector, {
            visible: true,
        });

        const result = await orirginalClickBind(selector, options);
        
        await captcha_exists();
        
        return result;
    }
};

function page_goto(page) {
    const originalGoto = page.goto.bind(page);

    return async function goto(url, options) {
        const result = await originalGoto(url, options);

        await captcha_exists();

        return result;
    };
}

function page_type(page) {
    const originalType = page.keyboard.type.bind(page.keyboard);

    return async function type(text, options) {
        const result = await originalType(text, options);

        await captcha_exists();

        return result;
    };
}

export function createPageActions(page) {
    return {
        click: page_click(page),
        goto: page_goto(page),
        type: page_type(page),
    };
}