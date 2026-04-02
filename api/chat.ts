import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ reply: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ reply: "Missing GEMINI_API_KEY" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { message, context } = body as { message?: string; context?: string };

    const safeMessage =
      message && message.trim().length > 0 ? message : "Summarize this news.";
    const safeContext =
      context && context.trim().length > 20 ? context : "";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const msg = safeMessage.toLowerCase();
    const isSummary = msg.includes("summar");
    const isGeneral =
      safeContext === "" ||
      (!msg.includes("this") && !msg.includes("article") && msg.length < 50);

    let prompt = "";

    if (isSummary && safeContext) {
      prompt = `Summarize the following news article in 3-4 lines:\n\n${safeContext}`;
    } else if (isGeneral) {
      prompt = `You are a helpful AI assistant.\n\nAnswer the user's question clearly and simply:\n\n${safeMessage}`;
    } else {
      prompt = `You are an AI assistant helping with a news article.\n\nArticle:\n${safeContext}\n\nUser Question:\n${safeMessage}\n\nIMPORTANT:\n- Answer the question directly\n- Do NOT summarize unless asked\n- Keep answer short and relevant`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    if (!text || text.trim().length < 5) {
      text = "⚠️ AI couldn't generate a proper response. Try again.";
    }

    return res.status(200).json({ reply: text });
  } catch (error: any) {
    if (error?.status === 429) {
      return res.status(200).json({
        reply: "⚠️ AI limit reached. Try again later.",
      });
    }

    return res.status(200).json({
      reply: "⚠️ AI temporarily unavailable.",
    });
  }
}
