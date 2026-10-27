export type CharacterMood = 'FELIZ' | 'DUDOSO' | 'ENOJADO' | 'TRANQUILO';

export interface CharacterSpeechBubble {
  text: string;
  mood: CharacterMood;
  variant: 'NORMAL' | 'URGENT' | 'RELIEF';
}

export function getCharacterFeedback(
  screen: string,
  gestureState: string,
  isProcessingActivation: boolean,
  isEmergencyActive: boolean,
  isCancelled: boolean
): { mood: CharacterMood; bubble: CharacterSpeechBubble | null; imageSrc: string } {
  // 1. Emergency confirmed active
  if (isEmergencyActive || gestureState === 'ACTIVE') {
    return {
      mood: 'ENOJADO',
      imageSrc: '/assets/character/enojado.png',
      bubble: {
        text: 'Alerta activada',
        mood: 'ENOJADO',
        variant: 'URGENT',
      },
    };
  }

  // 2. Activating in progress (waiting backend confirm)
  if (isProcessingActivation || gestureState === 'ACTIVATING') {
    return {
      mood: 'ENOJADO',
      imageSrc: '/assets/character/enojado.png',
      bubble: {
        text: 'Activando alerta...',
        mood: 'ENOJADO',
        variant: 'URGENT',
      },
    };
  }

  // 3. User holds SOS button (preparing or moving towards cancel)
  if (gestureState === 'PREPARING' || gestureState === 'CANCELLING') {
    return {
      mood: 'DUDOSO',
      imageSrc: '/assets/character/dudoso.png',
      bubble: {
        text: gestureState === 'CANCELLING' ? 'Desliza para cancelar' : 'Sigue presionando',
        mood: 'DUDOSO',
        variant: 'NORMAL',
      },
    };
  }

  // 4. Cancelled or Resolved
  if (isCancelled) {
    return {
      mood: 'TRANQUILO',
      imageSrc: '/assets/character/tranquilo.png',
      bubble: {
        text: 'Alerta cancelada',
        mood: 'TRANQUILO',
        variant: 'RELIEF',
      },
    };
  }

  // 5. Default / Idle / Presentation
  return {
    mood: 'FELIZ',
    imageSrc: '/assets/character/Feliz.png',
    bubble:
      screen === 'home'
        ? {
            text: 'Estoy aquí para acompañarte',
            mood: 'FELIZ',
            variant: 'NORMAL',
          }
        : null,
  };
}

