import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import { ChatbotAnswer, ChatbotSource } from './dto/chatbot.dto';

/**
 * Support chatbot grounded on the Knowledge Base. Retrieves the most relevant
 * articles, then (when ANTHROPIC_API_KEY is configured) asks Claude to answer
 * using only that context. Without a key it degrades to a retrieval-only reply,
 * so the feature works in every environment.
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly kb: KnowledgeBaseService,
  ) {
    const apiKey = this.config.get<string>('chatbot.anthropicApiKey');
    this.model = this.config.get<string>('chatbot.model') ?? 'claude-opus-4-8';
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async ask(question: string): Promise<ChatbotAnswer> {
    const articles = await this.kb.search(question);
    const sources: ChatbotSource[] = articles.slice(0, 4).map((a) => ({
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
    }));

    if (!this.client) {
      return { answer: this.retrievalAnswer(question, sources), sources, usedLlm: false };
    }

    try {
      const answer = await this.askClaude(question, sources);
      return { answer, sources, usedLlm: true };
    } catch (err) {
      this.logger.error('Claude request failed; falling back to retrieval', err as Error);
      return { answer: this.retrievalAnswer(question, sources), sources, usedLlm: false };
    }
  }

  // ── LLM path (official Anthropic SDK) ──
  private async askClaude(
    question: string,
    sources: ChatbotSource[],
  ): Promise<string> {
    const context =
      sources.length > 0
        ? sources
            .map((s, i) => `[${i + 1}] ${s.title}\n${s.excerpt}`)
            .join('\n\n')
        : 'No relevant help-center articles were found.';

    const system =
      'You are a friendly e-commerce support assistant. Answer the customer ' +
      'using ONLY the help-center context provided. If the context does not ' +
      'contain the answer, say you are not sure and suggest contacting support. ' +
      'Be concise and reference article titles where relevant.';

    const response = await this.client!.messages.create({
      model: this.model,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system,
      messages: [
        {
          role: 'user',
          content: `Help-center context:\n${context}\n\nCustomer question: ${question}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return 'I’m sorry, I can’t help with that request. Please contact our support team.';
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return text || this.retrievalAnswer(question, sources);
  }

  // ── retrieval-only fallback ──
  private retrievalAnswer(question: string, sources: ChatbotSource[]): string {
    if (sources.length === 0) {
      return `I couldn't find an article about that. Please contact our support team and we'll help with: "${question}".`;
    }
    const top = sources[0];
    return (
      `Based on our help center article "${top.title}": ${top.excerpt} ` +
      `\n\nRelated articles: ${sources.map((s) => s.title).join(', ')}.`
    );
  }
}
