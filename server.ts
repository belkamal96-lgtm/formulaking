import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API route for formula analysis using RapidAPI ChatGPT
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await axios.get('https://free-chatgpt-api.p.rapidapi.com/chat-completion-one', {
        params: { prompt },
        headers: {
          'x-rapidapi-host': process.env.RAPIDAPI_HOST || 'free-chatgpt-api.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || '264db72c15msh8c3bbc1ef5160cdp11bcf9jsn6777121a3a93'
        }
      });

      // The API response structure might vary, but usually it's in a 'header' or 'body' field
      // based on typical RapidAPI wrappers. We'll return the whole data or a specific field.
      res.json({ text: response.data.header || response.data.response || response.data });
    } catch (error: any) {
      console.error("RapidAPI Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to get response from ChatGPT API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
