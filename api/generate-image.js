// Vercel Serverless Function for Gemini 2.5 Flash Image (Nano Banana)
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        // Use Gemini 2.5 Flash with generateContent endpoint
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Generate an image in 9:16 aspect ratio: ${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 1,
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            return res.status(response.status).json({
                error: 'Failed to generate image',
                details: errorText
            });
        }

        const data = await response.json();

        // Extract image data from response
        // Gemini returns image data in the candidates
        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
                const imagePart = candidate.content.parts.find(part => part.inlineData);
                if (imagePart && imagePart.inlineData) {
                    return res.status(200).json({
                        image: imagePart.inlineData.data,
                        mimeType: imagePart.inlineData.mimeType
                    });
                }
            }
        }

        return res.status(500).json({
            error: 'No image in response',
            response: data
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
