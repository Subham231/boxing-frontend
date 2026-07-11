import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
    console.log(`ZEPHYR Backend Proxy running on port ${PORT}`);
});
