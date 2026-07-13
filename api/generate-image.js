// Vercel Serverless Function: Bildgenerierung fürs Jigsaw-Puzzle über fal.ai
// (nano-banana text-to-image). Liefert base64, damit der Client kein CORS-/Canvas-
// Taint-Problem mit externen fal-URLs bekommt.
export const config = { maxDuration: 90 };

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!process.env.FAL_API_KEY) {
        return res.status(500).json({ error: 'FAL_API_KEY not configured' });
    }

    try {
        const falRes = await fetch('https://fal.run/fal-ai/nano-banana', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Key ${process.env.FAL_API_KEY}`,
            },
            body: JSON.stringify({
                prompt: `Child-friendly, colorful, cheerful illustration for a kids jigsaw puzzle: ${prompt}`,
                num_images: 1,
                output_format: 'jpeg',
                aspect_ratio: '9:16',
            }),
        });

        if (!falRes.ok) {
            const detail = (await falRes.text().catch(() => '')).slice(0, 300);
            console.error('fal error:', detail);
            return res.status(502).json({ error: 'Failed to generate image', details: detail });
        }

        const data = await falRes.json();
        const url = data.images?.[0]?.url;
        if (!url) return res.status(502).json({ error: 'No image in response' });

        // Bild serverseitig holen und als base64 zurückgeben
        const imgRes = await fetch(url);
        if (!imgRes.ok) return res.status(502).json({ error: 'Image download failed' });
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

        return res.status(200).json({ image: buf.toString('base64'), mimeType });
    } catch (error) {
        console.error('generate-image error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
