import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export interface CommentaryCheckResult {
  hasCommentary: boolean;
  commentaryDetails: string;
  releaseFormat: string;
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface MovieDetailsResult {
  plot: string;
  runtime: string;
  rated: string;
  posterUrl: string;
}

export const checkCommentaryAvailability = async (
  title: string,
  year: string
): Promise<CommentaryCheckResult> => {
  const client = getAI();
  if (!client) {
    throw new Error("API Key not found");
  }

  // We ask for JSON format in the text prompt because we cannot use responseSchema with googleSearch tool.
  const prompt = `
    Search the web for the physical media releases (Blu-ray, 4K UHD, DVD) of the movie "${title}" (${year}).
    Specifically look for 'special features', 'bonus features', or reviews of the home release to determine if there is an audio commentary track.

    If a commentary exists, note who is on it (Director, Cast, etc.).
    Identify the release format (e.g., "Collector's Edition", "Criterion", "Standard Blu-ray").

    Return a valid JSON object in the following format. Do not include markdown formatting or code blocks:
    {
      "hasCommentary": boolean,
      "commentaryDetails": "string summary",
      "releaseFormat": "string format"
    }
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        // googleSearch is mutually exclusive with responseMimeType/responseSchema
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    // Extract JSON from potential markdown text
    let parsedData: any = {};
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        parsedData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON from response", text);
        parsedData = {
          hasCommentary: false,
          commentaryDetails: "Error parsing details",
          releaseFormat: "Unknown"
        };
      }
    } else {
       parsedData = {
          hasCommentary: false,
          commentaryDetails: "No structured data found",
          releaseFormat: "Unknown"
        };
    }

    // Extract Grounding Metadata (Source URLs)
    let sourceUrl: string | undefined;
    let sourceTitle: string | undefined;

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && groundingChunks.length > 0) {
      const webChunk = groundingChunks.find((c: any) => c.web?.uri);
      if (webChunk && webChunk.web) {
        sourceUrl = webChunk.web.uri;
        sourceTitle = webChunk.web.title;
      }
    }

    return {
      hasCommentary: !!parsedData.hasCommentary,
      commentaryDetails: parsedData.commentaryDetails || "Details not available",
      releaseFormat: parsedData.releaseFormat || "Unknown",
      sourceUrl,
      sourceTitle
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      hasCommentary: false,
      commentaryDetails: "Error checking availability",
      releaseFormat: "Unknown",
    };
  }
};

export const getMovieDetails = async (
  title: string,
  year: string
): Promise<MovieDetailsResult> => {
  const client = getAI();
  if (!client) throw new Error("API Key not found");

  const prompt = `
    Find the following details for the movie "${title}" released in ${year}:
    1. Plot Summary (2-3 sentences max)
    2. Runtime (e.g. "2h 15m")
    3. MPAA Rating (e.g. "PG-13", "R")
    4. A direct URL to the movie poster. 
       IMPORTANT: Prefer a high-quality image URL from Wikimedia Commons (upload.wikimedia.org) or Wikipedia if available, as these are most reliable. 
       Avoid generic IMDb or store page URLs that are not actual image files. The URL should end in .jpg, .png or .webp.
    
    Return a valid JSON object. Do not use markdown:
    {
      "plot": "string",
      "runtime": "string",
      "rated": "string",
      "posterUrl": "string"
    }
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    const jsonMatch = text?.match(/\{[\s\S]*\}/);
    let data: any = {};

    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("JSON Parse Error for details", e);
      }
    }

    // Try to find an image in grounding if the JSON one is empty or invalid
    let posterUrl = data.posterUrl;
    
    // Sometimes grounding chunks contain images if the model found one during search
    // We can try to look for image chunks if text extraction failed
    if (!posterUrl || posterUrl.length < 10) {
       // Fallback logic could go here, but for now we rely on the model's search text
    }

    return {
      plot: data.plot || "Plot not available.",
      runtime: data.runtime || "Unknown",
      rated: data.rated || "Unrated",
      posterUrl: posterUrl || ""
    };

  } catch (error) {
    console.error("Gemini Details Error:", error);
    return {
      plot: "Could not load details.",
      runtime: "--",
      rated: "--",
      posterUrl: ""
    };
  }
};