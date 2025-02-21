import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.post('/analyze', async (req, res) => {
  try {
    const base64Image = req.body.image.split(',')[1];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image? Provide a detailed description." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 300,
    });
    
    res.json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
