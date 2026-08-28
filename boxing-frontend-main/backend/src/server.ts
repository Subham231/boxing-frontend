import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { paymentsRouter, handleWebhook } from './routes/payments';
import { requireAuth, AuthedRequest } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ---------------------------------------------------------------------------
// CORS: restrict to known production/dev origins instead of allowing every
// origin by default. Set ALLOWED_ORIGINS in .env as a comma-separated list
// for production (e.g. "https://sparai.app,https://www.sparai.app").
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow no-origin requests (server-to-server, curl, mobile apps)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many AI requests. Please try again later.' },
});

// ---------------------------------------------------------------------------
// CRITICAL ORDERING: the Razorpay webhook route needs the raw request body
// (as a Buffer) to compute the HMAC signature correctly. It MUST be
// registered with express.raw() BEFORE the global express.json() parser
// below, and only for this exact path — every other route keeps using
// normal JSON parsing.
// ---------------------------------------------------------------------------
app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    handleWebhook
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Payment routes (create-subscription, create-order, verify, subscription-status)
app.use('/api/payments', paymentsRouter);

// Proxy Route for Gemini AI
app.post('/api/analyze-session', async (req: Request, res: Response) => {
    try {
        const { metrics } = req.body;

        if (!metrics) {
            return res.status(400).json({ error: 'Metrics are required' });
        }

        // Rule 2: Backend only digests summarized metrics, never raw video.
        // In production, this would call the Google Gemini API using process.env.GEMINI_API_KEY
        console.log('Forwarding metrics to Gemini AI:', metrics);

        // Mock response for now
        const mockAnalysis = {
            feedback: "Great session! Your punch velocity is increasing. Keep your chin down during the hook.",
            tip: "Work on hip rotation for more power.",
            score: 85
        };

        res.json({ analysis: mockAnalysis });
    } catch (error) {
        console.error('Gemini Proxy Error:', error);
        res.status(500).json({ error: 'Internal AI processing error' });
    }
});

// UPGRADED: Endpoint to generate Training Roadmap/Plan with Gemini
app.post('/api/generate-plan', async (req: Request, res: Response) => {
    try {
        const { experience, focus, equipment, duration, frequency, user_metrics } = req.body;

        // Validate required fields
        if (!experience || !focus || !equipment || !duration || !frequency) {
            return res.status(400).json({
                error: 'Missing required fields: experience, focus, equipment, duration, frequency'
            });
        }

        console.log('Generating elite training plan for:', {
            experience,
            focus,
            equipment,
            duration,
            frequency
        });

        // ========== PROMPT ENGINEERING FOR GEMINI ==========
        const systemInstruction = `You are an Elite Boxing Headmaster AI. Your role is to craft customized, competition-ready 7-day boxing training roadmaps. 

EXPERT RULES:
1. Generate a title that reflects the fighter's primary focus and experience level
2. Use ONLY these punch combinations (boxing numbers):
   - 1 = Jab
   - 2 = Cross
   - 3 = Lead Hook
   - 4 = Rear Hook
   - 5 = Lead Uppercut
   - 6 = Rear Uppercut
   - Combinations like "1-2-3" means Jab-Cross-Lead Hook
3. EQUIPMENT RESTRICTIONS: If equipment list contains "shadowbox" ONLY, NO bag work drills
4. TIME CONDITIONING: Match training density and volume to ${duration} minute sessions
5. Generate realistic, progressive weekly structure that builds intensity toward week end
6. Every drill must be ACTIONABLE with specific punch combos, set/rep counts, and rest periods
7. Return ONLY valid JSON, no markdown or explanations

RESPONSE FORMAT (STRICT JSON):
{
  "title": "String describing the fighter's custom roadmap",
  "week_range": "MON Jan 13 - SUN Jan 19",
  "intensity_score": number 0-100,
  "experience_note": "Brief note on why this plan suits their level",
  "days": [
    {
      "day_name": "MON",
      "date": "13",
      "intensity": number 0-100,
      "warm_up": {
        "duration": "5 MIN",
        "drills": ["Shadowbox 2 rounds", "Joint prep: shoulders, wrists, ankles"]
      },
      "main_block": [
        {
          "title": "COMBINATION CHAINS",
          "combos": ["1-2", "1-2-3-2", "1-2-3-4"],
          "format": "3 rounds x 30 sec work / 15 sec rest",
          "reps": 3,
          "impact": "EXPLOSIVE POWER"
        }
      ],
      "cool_down": {
        "duration": "3 MIN",
        "recovery": "Light shadowbox + stretching"
      }
    }
  ],
  "weekly_focus": "Describe the overall weekly progression"
}`;

        const userPrompt = `Create an elite 7-day boxing training plan with these fighter metrics:
- Experience Level: ${experience}
- Primary Focus: ${focus}
- Available Equipment: ${equipment.join(', ')}
- Daily Session Duration: ${duration} minutes
- Weekly Frequency: ${frequency} days per week
${user_metrics ? `- Additional Metrics: Age ${user_metrics.age}, Weight ${user_metrics.weight}kg, Height ${user_metrics.height}cm` : ''}

Generate a JSON training roadmap optimized for these exact parameters. Ensure every drill is feasible within ${duration} minutes.`;

        // Call Gemini 2.5 Flash model
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction,
        });

        const result = await model.generateContent(userPrompt);
        const responseText = result.response.text();

        // Parse Gemini response
        let planData;
        try {
            // Remove markdown code block wrappers if present
            const cleanedText = responseText
                .replace(/^```json\n?/, '')
                .replace(/^```\n?/, '')
                .replace(/\n?```$/, '')
                .trim();

            planData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', responseText);
            throw new Error('AI response format invalid');
        }

        // Validate plan structure
        if (!planData.title || !planData.days || !Array.isArray(planData.days)) {
            throw new Error('Generated plan missing required fields');
        }

        // Store metadata
        const plan = {
            ...planData,
            generated_at: new Date().toISOString(),
            version: 'v2.0',
            fighter_profile: {
                experience,
                focus,
                equipment,
                duration,
                frequency,
            }
        };

        res.json({
            status: 'success',
            plan
        });

    } catch (error) {
        console.error('Plan Generation Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            error: 'Failed to generate training plan',
            details: errorMessage
        });
    }
});

// ---------------------------------------------------------------------------
// POST /api/weekly-debrief
// Replaces a previous implementation that called the Gemini API directly
// from the browser with a hardcoded API key embedded in client JS (a real,
// exploitable secret exposure — anyone could read it from page source and
// use it against this project's Gemini quota). Generation now happens here,
// server-side, using the private GEMINI_API_KEY env var only.
// ---------------------------------------------------------------------------
app.post('/api/weekly-debrief', aiLimiter, requireAuth, async (req: AuthedRequest, res: Response) => {
    try {
        const { name, primaryGoal, promiseVal, daysActive, totalDrills, weeklySummary } = req.body || {};

        if (typeof daysActive !== 'number' || typeof totalDrills !== 'number') {
            return res.status(400).json({ error: 'Missing or invalid progress metrics' });
        }

        const safeName = String(name || 'FIGHTER').slice(0, 40);
        const safeGoal = String(primaryGoal || 'unbeatable speed').slice(0, 120);
        const safePromise = String(promiseVal || 'to never break the chain').slice(0, 120);
        const safeSummary = Array.isArray(weeklySummary) ? weeklySummary.slice(0, 7).join(', ') : '';

        const systemPrompt = `You are the Synthetic Combat Intelligence Narrator. Generate a cinematic, atmospheric session summary for a fighter named ${safeName} based on their current week's progression.
The tone should be gritty, intense, and futuristic.
Progress: ${daysActive} active days and ${totalDrills} drills completed this week.
Keep it under 120 words. Focus on their discipline and the evolution of their power.`;

        const userPrompt = `Weekly Progress: ${safeSummary}. Goal: ${safeGoal}. Promise: ${safePromise}.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        const text = result.response.text();

        res.json({ text });
    } catch (err) {
        console.error('Weekly Debrief Error:', err);
        res.status(500).json({ error: 'Failed to generate weekly debrief' });
    }
});

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`SparAI Backend Proxy running on port ${PORT}`);
});
