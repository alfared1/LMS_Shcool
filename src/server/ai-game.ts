import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import { generateSmartGameConfig, type GameDifficulty } from '../lib/ai-game-generator';
import type { GameEngineType } from '../types/lms';

function validateEngineConfig(engineType: GameEngineType, config: Record<string, unknown>): boolean {
  if (!config || typeof config !== 'object') return false;
  if (engineType === 'MILLIONAIRE_QUIZ' || engineType === 'TURN_BASED_ARENA') {
    const qs = (config as { questions?: unknown }).questions;
    return Array.isArray(qs) && qs.length >= 2;
  }
  if (engineType === 'SWIPE_CARD') {
    const cards = (config as { cards?: unknown }).cards;
    return Array.isArray(cards) && cards.length >= 2;
  }
  if (engineType === 'IFP_TOWER_BATTLE') {
    const prompts = (config as { prompts?: unknown }).prompts;
    return Array.isArray(prompts) && prompts.length >= 2;
  }
  if (engineType === 'ROLEPLAY_LKPD') {
    const cases = (config as { phishingCases?: unknown }).phishingCases;
    return Array.isArray(cases) && cases.length >= 2;
  }
  return false;
}

function schemaPromptForEngine(engineType: GameEngineType): string {
  switch (engineType) {
    case 'MILLIONAIRE_QUIZ':
      return `{
  "title": "string",
  "config": {
    "subtitle": "string",
    "microLearningSummary": "string",
    "questions": [
      {
        "id": "q-1",
        "question": "string",
        "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
        "correctId": "A|B|C|D",
        "ustadzHint": "string",
        "jamaahPoll": {"A":15,"B":65,"C":12,"D":8},
        "rewardTier": "Level 1"
      }
    ]
  }
}`;
    case 'SWIPE_CARD':
      return `{
  "title": "string",
  "config": {
    "subtitle": "string",
    "leftLabel": "string",
    "rightLabel": "string",
    "kitabSummary": "string",
    "cards": [
      { "id": "c-1", "title": "string", "relation": "string", "answer": "LEFT|RIGHT", "explanation": "string" }
    ]
  }
}`;
    case 'IFP_TOWER_BATTLE':
      return `{
  "title": "string",
  "config": {
    "subtitle": "string",
    "durationSeconds": 60,
    "leftTeam": { "name": "string", "targetCategory": "MUDZAKKAR", "buttonLabel": "string" },
    "rightTeam": { "name": "string", "targetCategory": "MUANNATS", "buttonLabel": "string" },
    "prompts": [
      { "arabic": "string (short word)", "translit": "string (main prompt)", "meaning": "string (hint)", "category": "MUDZAKKAR|MUANNATS" }
    ]
  }
}`;
    case 'ROLEPLAY_LKPD':
      return `{
  "title": "string",
  "config": {
    "subtitle": "string",
    "phishingCases": [
      { "id": "p-1", "sender": "string", "url": "string", "snippet": "string", "isPhishing": true, "reason": "string" }
    ]
  }
}`;
    case 'TURN_BASED_ARENA':
    default:
      return `{
  "title": "string",
  "config": {
    "subtitle": "string",
    "turnDurationSeconds": 20,
    "teamA": { "name": "string", "role": "string" },
    "teamB": { "name": "string", "role": "string" },
    "questions": [
      {
        "id": "a-1",
        "question": "string",
        "options": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
        "correctId": "A|B|C|D",
        "ihsanHint": "string"
      }
    ]
  }
}`;
  }
}

export async function handleAiGameGenerate(req: Request, res: Response): Promise<void> {
  const body = (req.body || {}) as {
    prompt?: string;
    engineType?: GameEngineType;
    level?: 'SMP' | 'SMA';
    gradeLevel?: number;
    subjectName?: string;
    difficulty?: GameDifficulty;
  };

  const prompt = String(body.prompt || '').trim();
  const engineType: GameEngineType = body.engineType || 'MILLIONAIRE_QUIZ';
  const level: 'SMP' | 'SMA' = body.level === 'SMP' ? 'SMP' : 'SMA';
  const gradeLevel = Number(body.gradeLevel || 10);
  const subjectName = String(body.subjectName || 'Umum');
  const difficulty: GameDifficulty =
    body.difficulty === 'Mudah' || body.difficulty === 'HOTS' ? body.difficulty : 'Sedang';

  if (!prompt) {
    res.status(400).json({ error: 'Prompt topik pembelajaran wajib diisi.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const instruction = `Anda adalah perancang kurikulum dan game edukasi sekolah Indonesia.
Buatlah konten game edukasi dalam Bahasa Indonesia untuk:
- Mata Pelajaran: ${subjectName}
- Jenjang/Kelas: ${level} Kelas ${gradeLevel}
- Tingkat Kesulitan: ${difficulty}
- Engine Game: ${engineType}
- Instruksi Guru: "${prompt}"

Keluarkan HANYA JSON valid (tanpa markdown fence) yang mengikuti persis skema berikut:
${schemaPromptForEngine(engineType)}
Buat minimal 4-5 item soal/kartu/kasus yang akurat dan mendidik.`;

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini generation timeout')), 3500);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: instruction,
          config: {
            responseMimeType: 'application/json',
          },
        }),
        timeoutPromise,
      ]);

      const rawText = response.text || '';
      const parsed = JSON.parse(rawText) as { title?: string; config?: Record<string, unknown> };
      if (parsed && parsed.config && validateEngineConfig(engineType, parsed.config)) {
        res.json({
          title: parsed.title || `Game AI ${subjectName}`,
          config: parsed.config,
          source: 'gemini',
        });
        return;
      }
    } catch {
      // Fall through to deterministic Smart Contextual Generator
    }
  }

  const fallback = generateSmartGameConfig({
    prompt,
    engineType,
    level,
    gradeLevel,
    subjectName,
    difficulty,
  });
  res.json(fallback);
}
