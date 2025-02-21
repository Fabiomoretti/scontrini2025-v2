import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const base64Image = req.body.image.split(',')[1];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analizza questo scontrino e fornisci: tipo di spesa, importo totale, descrizione dei prodotti/servizi e nome dell'azienda." 
            },
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
    
    res.status(200).json({ analysis: response.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
