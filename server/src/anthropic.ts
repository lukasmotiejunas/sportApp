import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

// Lazy initializer — the rest of the app boots without ANTHROPIC_API_KEY. Only
// /training-templates/generate needs this and it fails loudly if the key is
// missing at call time.
export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY nėra nustatytas. Pridėkite jį į server/.env.',
    );
  }
  cached = new Anthropic({ apiKey: key });
  return cached;
}
