export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  GEMINI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/gemini-ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected websocket', { status: 426 });
      }

      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) {
        return new Response('API key not configured in environment', { status: 500 });
      }

      const geminiUrl = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' + apiKey;
      const targetUrl = geminiUrl.replace('wss://', 'https://');

      return fetch(targetUrl, {
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
