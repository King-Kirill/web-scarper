import puppeteer from 'puppeteer';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import os from 'os';

const app = express();

app.use(express.json());

// server port
const PORT = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// getting captcha transcription from google gemini
app.post('/get-captcha', async (req, res) => {

    const { captchaRef } = req.body;

    if(!captchaRef)
    {
        return res.status(400).json({
            error: 'captchaRef needed'
        })
    }

    // Launch the browser and open a new blank page.
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const uniqueUserDir = path.join(os.tmpdir(), `puppeteer_profile_${uniqueId}`);
    
    const browser = await puppeteer.launch({userDataDir: uniqueUserDir, headless: false, timeout: 3000});
    
    try{
        const page = await browser.newPage();

        // navigate the page to a URL.
        await page.goto('https://www.google.com/search?q=&sourceid=chrome&ie=UTF-8&udm=50&aep=48&cud=0&source=chrome.crn.obic');
 
        await sleep(20000); // 20 seconds pause
        
        const search_str = captchaRef + ' скажи что за надпись на этой фотке по ссылке, напиши только надпись и больше ничего не пиши';
        await page.keyboard.type(search_str);

        await sleep(10000); // 10 seconds pause

        const captcha = await page.$eval('.n6owBd.awi2gc [data-subtree="aimf1"]', element => element.textContent);

        console.log(captcha);

        if(captcha)
        {
            return res.status(200).json({
                captcha: captcha
            })
        }
        else{
            return res.status(404).json({
                error: "failed to find athe object tree"
            })
        }
    }
    catch(error)
    {
        console.log(error);
    }
    finally
    {
        await browser.close();
    }
});

// starting the server and listening for requests
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});