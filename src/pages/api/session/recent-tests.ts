import type { NextApiRequest, NextApiResponse } from 'next';
import { userSessionsService } from '@/lib/db/services';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Session ID required' });
  }

  if (req.method === 'GET') {
    try {
      const recentTests = await userSessionsService.getRecentTests(sessionId);
      return res.status(200).json({ recentTests });
    } catch (error: unknown) {
      console.error('Failed to get recent tests:', error);
      return res.status(500).json({ error: 'Failed to get recent tests' });
    }
  }

  if (req.method === 'POST') {
    const { testId, url, title, runAt } = req.body;

    if (!testId) {
      return res.status(400).json({ error: 'testId required' });
    }

    try {
      await userSessionsService.addRecentTest(sessionId, {
        testId,
        url,
        title,
        runAt,
      });

      return res.status(200).json({ success: true });
    } catch (error: unknown) {
      console.error('Failed to add recent test:', error);
      return res.status(500).json({ error: 'Failed to add recent test' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}