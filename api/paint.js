export const config = { maxDuration: 60 };

const BASE =
  "Look at this child's drawing. Interpret it generously and with imagination - " +
  "even rough scribbles depict something: a creature, a person, an animal, a vehicle, " +
  "a house or a landscape. Repaint the recognized subject as a beautiful, cheerful, " +
  "child-friendly picture. Keep the main elements and rough composition of the drawing. ";

const STYLE_PROMPTS = {
  pixar:
    BASE +
    "Style: high-quality 3D animated movie still (Pixar-like): soft cinematic lighting, " +
    "expressive characters, vibrant colors, gentle depth of field.",
  comic:
    BASE +
    "Style: colorful comic book illustration: bold clean outlines, flat vivid colors, " +
    "halftone shading, dynamic and fun.",
  anime:
    BASE +
    "Style: anime illustration: cel shading, expressive eyes on characters, " +
    "detailed painted background, bright and cheerful.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { image, style } = req.body || {};
  if (!STYLE_PROMPTS[style]) {
    return res.status(400).json({ error: "Unknown style" });
  }
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Invalid image" });
  }
  if (!process.env.FAL_API_KEY) {
    return res.status(500).json({ error: "FAL_API_KEY not configured" });
  }

  const falRes = await fetch("https://fal.run/fal-ai/nano-banana/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${process.env.FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: STYLE_PROMPTS[style],
      image_urls: [image],
      num_images: 1,
      output_format: "jpeg",
    }),
  });

  if (!falRes.ok) {
    const detail = (await falRes.text().catch(() => "")).slice(0, 300);
    return res.status(502).json({ error: "Generation failed", detail });
  }
  const data = await falRes.json();
  const url = data.images?.[0]?.url;
  if (!url) {
    return res.status(502).json({ error: "No image returned" });
  }
  return res.status(200).json({ url });
}
