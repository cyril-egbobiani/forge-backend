const { GoogleGenAI, Type } = require("@google/genai");
const { YoutubeTranscript } = require("youtube-transcript");

/**
 * Helper to extract YouTube video ID from URL
 */
function extractYouTubeId(url) {
  if (!url) return null;
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = regex.exec(url);
  return match ? match[1] : (url.length === 11 ? url : null);
}

/**
 * Helper to format seconds into mm:ss
 */
function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Service to generate AI Theological Insights and Key Moments for Teachings
 */
class AiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else {
      console.warn("⚠️ GEMINI_API_KEY not set in forge-backend/.env. Using intelligent local synthesis fallback.");
      this.ai = null;
    }
  }

  /**
   * Fetch video transcript directly from YouTube
   */
  async fetchVideoTranscript(youtubeUrl, youtubeVideoId) {
    const videoId = youtubeVideoId || extractYouTubeId(youtubeUrl);
    if (!videoId) return null;

    try {
      console.log(`🎬 Scanning YouTube video for transcript: ${videoId}...`);
      const transcriptChunks = await YoutubeTranscript.fetchTranscript(videoId);
      if (!transcriptChunks || transcriptChunks.length === 0) return null;

      // Sample every few chunks with timestamp markers
      let formattedTranscript = "";
      let lastSecond = -30;

      for (const chunk of transcriptChunks) {
        const currentSec = Math.floor(chunk.offset / 1000);
        if (currentSec - lastSecond >= 20) {
          formattedTranscript += `\n[${formatSeconds(currentSec)}] ${chunk.text} `;
          lastSecond = currentSec;
        } else {
          formattedTranscript += `${chunk.text} `;
        }
      }

      console.log(`✅ Extracted ${transcriptChunks.length} transcript chunks from YouTube video.`);
      return formattedTranscript.substring(0, 15000); // Send up to 15k chars to Gemini
    } catch (e) {
      console.log(`ℹ️ YouTube transcript not available for video ${videoId} (${e.message}). Using text inputs.`);
      return null;
    }
  }

  /**
   * Generate Key Moments & Exegesis for a Teaching
   */
  async generateTeachingInsights({ title, description, speaker, scripture, transcript, youtubeUrl, youtubeVideoId }) {
    // Attempt automatic YouTube transcript scan if video URL is present
    let autoTranscript = transcript;
    if (!autoTranscript && (youtubeUrl || youtubeVideoId)) {
      autoTranscript = await this.fetchVideoTranscript(youtubeUrl, youtubeVideoId);
    }

    if (!this.ai) {
      return this._generateFallbackInsights({ title, description, speaker, scripture });
    }

    try {
      const prompt = `
You are a senior Christian theologian and biblical scholar assisting the Forge church app.
Analyze the following sermon teaching and generate deep theological insights, Greek/Hebrew exegesis, scripture cross-references, and 3-4 timestamped Key Moments for the video timeline.
If a timestamped YouTube transcript is provided below, identify the EXACT moments and seconds (e.g. 04:12 -> 252 seconds) where these points were preached.

Teaching Title: ${title}
Speaker: ${speaker || "Pastor"}
Scripture Anchor: ${scripture || "Philippians 2:13"}
Description: ${description || ""}
Spoken Transcript / Outline: ${autoTranscript || "Not provided; infer key themes from title and scripture"}

Provide a structured response adhering strictly to the JSON schema.
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiInsights: {
                type: Type.OBJECT,
                properties: {
                  coreThesis: { type: Type.STRING },
                  theologicalContext: { type: Type.STRING },
                  scriptureReferences: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        reference: { type: Type.STRING },
                        context: { type: Type.STRING },
                        greekExegesis: { type: Type.STRING },
                      },
                      required: ["reference", "context", "greekExegesis"],
                    },
                  },
                  reflectionPrompts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["coreThesis", "theologicalContext", "scriptureReferences", "reflectionPrompts"],
              },
              keyMoments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    timestamp: { type: Type.STRING, description: "e.g. 04:12" },
                    seconds: { type: Type.NUMBER, description: "e.g. 252" },
                    title: { type: Type.STRING, description: "Short moment title" },
                    subtitle: { type: Type.STRING, description: "Contextual subtitle" },
                    scripture: { type: Type.STRING, description: "Scripture anchor for moment" },
                    takeaway: { type: Type.STRING, description: "1-2 sentence actionable summary" },
                  },
                  required: ["timestamp", "seconds", "title", "subtitle", "scripture", "takeaway"],
                },
              },
            },
            required: ["aiInsights", "keyMoments"],
          },
        },
      });

      const parsed = JSON.parse(response.text);
      return parsed;
    } catch (error) {
      console.error("Gemini AI generation failed, falling back to local synthesis:", error);
      return this._generateFallbackInsights({ title, description, speaker, scripture });
    }
  }

  _generateFallbackInsights({ title, description, speaker, scripture }) {
    return {
      aiInsights: {
        coreThesis: `In "${title}", God reveals that divine obedience is not achieved through human striving, but by the supernatural energy of the Holy Spirit operative within the believer.`,
        theologicalContext: `Exposition of ${scripture || "Philippians 2:13"} emphasizing the covenantal promise of divine empowerment.`,
        scriptureReferences: [
          {
            reference: scripture || "Philippians 2:12-13",
            context: "Primary exposition on divine enablement",
            greekExegesis: "ἐνεργέω (energeō) — continuous divine energy at work within the believer's inner spirit.",
          },
          {
            reference: "Romans 12:1-2",
            context: "Mindset renewal and discernment of God's perfect will.",
            greekExegesis: "μεταμορφόω (metamorphoō) — inward spiritual transformation.",
          },
          {
            reference: "Hebrews 13:20-21",
            context: "Equipping grace for every good work.",
            greekExegesis: "καταρτίζω (katartizō) — mending and fitting for purpose.",
          },
        ],
        reflectionPrompts: [
          "In what area of your life are you relying on human willpower rather than divine energy?",
          "What practical habit can you surrender to God's good pleasure this week?",
        ],
      },
      keyMoments: [
        {
          timestamp: "04:12",
          seconds: 252,
          title: "Worship & Alignment",
          subtitle: "Anelia Cafe Live Set",
          scripture: "Psalm 100:1-4",
          takeaway: "Entering the secret place with thanksgiving silences the noise of everyday distraction.",
        },
        {
          timestamp: "18:45",
          seconds: 1125,
          title: "The Illusion of Self-Sufficiency",
          subtitle: "Why human willpower collapses under trials",
          scripture: scripture || "Philippians 2:13",
          takeaway: "Fruitfulness is a byproduct of abiding in grace, not strenuous striving.",
        },
        {
          timestamp: "34:10",
          seconds: 2050,
          title: "The Impartation Prayer",
          subtitle: "Surrendering personal agendas for Kingdom purpose",
          scripture: "Hebrews 13:20-21",
          takeaway: "A prayer of consecration to equip you with follow-through and spiritual endurance.",
        },
      ],
    };
  }

  /**
   * Interactive AI Study Assistant for mobile app users
   * Includes safety & theological guardrails for scripture study
   */
  async askAiStudy({ question, teachingTitle, speaker, scripture, transcript, keyMoment, chatHistory }) {
    if (!this.ai) {
      return this._generateFallbackChatResponse(question, teachingTitle);
    }

    try {
      const systemInstruction = `You are the Forge AI Theological Assistant, a compassionate, biblically grounded pastoral scholar.
Your role is to help church members dive deeper into scripture, sermons, Greek/Hebrew root words, key moments in worship, and personal Christian life applications.
Guardrails:
- Maintain a warm, encouraging, Christ-centered tone.
- Base explanations on the Bible and historical/theological context.
- If a user asks questions completely unrelated to spiritual growth, biblical study, or church life, gently steer them back to faith and scripture.
- Keep responses concise, clear, and practical for mobile reading (2-3 paragraphs max).`;

      let contextPrompt = `Teaching Title: ${teachingTitle || "Sermon Teaching"}\nSpeaker: ${speaker || "Pastor"}\nScripture Reference: ${scripture || ""}\n`;
      if (keyMoment) {
        contextPrompt += `Focus Key Moment: ${keyMoment.title} (${keyMoment.timestamp}) - ${keyMoment.subtitle || ""}\nTakeaway: ${keyMoment.takeaway || ""}\n`;
      }
      if (transcript) {
        contextPrompt += `Transcript Context: ${transcript.substring(0, 1000)}\n`;
      }

      const historyFormatted = (chatHistory || [])
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n");

      const prompt = `${systemInstruction}\n\n[Context]\n${contextPrompt}\n\n[Conversation History]\n${historyFormatted}\n\nUser Question: ${question}\n\nAssistant Response:`;

      const response = await this.ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      return {
        success: true,
        answer: response.text || "Grace and peace. Let us continue exploring God's word together.",
      };
    } catch (error) {
      console.error("Gemini askAiStudy error:", error);
      return this._generateFallbackChatResponse(question, teachingTitle);
    }
  }

  /**
   * Deep dive analysis into a specific Key Moment
   */
  async getKeyMomentInsight({ momentTitle, momentSubtitle, timestamp, scripture, takeaway, teachingTitle, speaker }) {
    if (!this.ai) {
      return {
        success: true,
        deepDive: `${momentTitle} represents a pivotal moment in this teaching where believers are called to align their hearts with God.`,
        theologicalSignificance: `Grounding in ${scripture || "scripture"} reminds us of God's covenant faithfulness and divine enablement.`,
        practicalApplication: takeaway || "Take 5 minutes today in quiet prayer to surrender your anxieties to God.",
        prayerPrompt: "Lord, align my desires with Your heart, and grant me the grace to walk in Your ways today.",
      };
    }

    try {
      const prompt = `You are a Christian biblical scholar. Provide an in-depth spiritual deep-dive for this specific moment in a sermon:
Teaching: ${teachingTitle || "Sermon"} by ${speaker || "Pastor"}
Moment: ${momentTitle} at ${timestamp || ""} (${momentSubtitle || ""})
Scripture Anchor: ${scripture || "Philippians 2:13"}
Summary: ${takeaway || ""}

Respond in strict JSON with the following structure:
{
  "deepDive": "2-3 sentence theological exploration of this moment",
  "theologicalSignificance": "Why this moment matters spiritually",
  "practicalApplication": "Actionable spiritual practice or habit for the believer",
  "prayerPrompt": "A heartfelt 1-2 sentence prayer"
}`;

      const response = await this.ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text);
      return {
        success: true,
        ...parsed,
      };
    } catch (error) {
      console.error("Gemini moment AI error:", error);
      return {
        success: true,
        deepDive: `${momentTitle} is a moment of spiritual alignment and illumination.`,
        theologicalSignificance: `Based on ${scripture || "scripture"}, this moment anchors our faith in divine grace.`,
        practicalApplication: takeaway || "Reflect on this scripture during your devotional time.",
        prayerPrompt: "Lord, speak to my heart and guide my steps according to Your holy word.",
      };
    }
  }

  _generateFallbackChatResponse(question, teachingTitle) {
    const lower = (question || "").toLowerCase();
    let text = `Regarding "${teachingTitle || "the teaching"}": Scripture reveals that when your inward desires feel misaligned with God's standard, you can boldly pray for divine transformation. God's grace is empowering before it is demanding.`;

    if (lower.includes("greek") || lower.includes("hebrew") || lower.includes("root") || lower.includes("word")) {
      text = `In the original biblical text, the operative word is ἐνεργέω (energeō) — denoting supernatural, divine energy continuously active within the spirit of the believer. God does not merely instruct human willpower; He implants both the desire (thelein) and the divine power (energein) to accomplish His purpose.`;
    } else if (lower.includes("devotion") || lower.includes("prayer") || lower.includes("daily")) {
      text = `Here is a daily spiritual reflection:\n\n1. Pause and invite the Holy Spirit to search your heart (Psalm 139:23-24).\n2. Confess any areas where you have been operating in human self-reliance.\n3. Proclaim Philippians 2:13: "God is working in me both to will and to do His good pleasure."`;
    } else if (lower.includes("anxiety") || lower.includes("fear") || lower.includes("worry") || lower.includes("peace")) {
      text = `Anxiety frequently arises when we shoulder responsibilities that belong in God's hands. When we surrender our agendas, the peace of God, which surpasses all human understanding, guards our hearts and minds (Philippians 4:6-7).`;
    }

    return {
      success: true,
      answer: text,
    };
  }
}

module.exports = new AiService();

