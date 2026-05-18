import type { HomeAssistant, LovelaceCard, LovelaceCardConfig } from 'custom-card-helpers';

export type { HomeAssistant, LovelaceCard, LovelaceCardConfig };

declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description?: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
