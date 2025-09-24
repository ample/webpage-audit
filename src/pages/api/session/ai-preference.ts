import type { NextApiRequest, NextApiResponse } from 'next';
import { userSessionsService } from '@/lib/db/services';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId, testId } = req.query;

  if (!sessionId || typeof sessionId !== 'string' || !testId || typeof testId !== 'string') {
    return res.status(400).json({ error: 'Session ID and Test ID required' });
  }

  if (req.method === 'GET') {
    try {
      const preference = await userSessionsService.getAiPreference(sessionId, testId);
      return res.status(200).json({ useAi: preference });
    } catch (error: unknown) {
      console.error('Failed to get AI preference:', error);
      return res.status(500).json({ error: 'Failed to get AI preference' });
    }
  }

  if (req.method === 'POST') {
    const { useAi } = req.body;

    if (typeof useAi !== 'boolean') {
      return res.status(400).json({ error: 'useAi must be a boolean' });
    }

    try {
      await userSessionsService.setAiPreference(sessionId, testId, useAi);
      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      console.error('Failed to set AI preference:', error);
      return res.status(500).json({ error: 'Failed to set AI preference' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}