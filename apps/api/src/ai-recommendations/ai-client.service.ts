import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-5';

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly client: Anthropic;

  constructor(config: ConfigService) {
    this.client = new Anthropic({ apiKey: config.get<string>('ANTHROPIC_API_KEY') });
  }

  /**
   * Sends a prompt that must be answered with a single JSON value and parses
   * the response. Returns null on any failure (timeout, malformed JSON,
   * missing API key) so callers can fall back to the non-AI path instead of
   * surfacing an error to the user.
   */
  async askForJson<T>(systemPrompt: string, userPrompt: string): Promise<T | null> {
    try {
      const message = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return null;
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        return null;
      }
      return JSON.parse(jsonMatch[0]) as T;
    } catch (err) {
      this.logger.warn(`Claude API çağrısı başarısız, algoritmik moda düşülüyor: ${(err as Error).message}`);
      return null;
    }
  }
}
