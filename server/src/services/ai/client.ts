export interface AiClient {
  chat(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]): Promise<string>;
}

export function createDeepSeekClient(apiKey?: string): AiClient {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is required');

  return {
    async chat(messages) {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${error}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    },
  };
}
