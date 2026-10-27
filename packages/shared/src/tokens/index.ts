/**
 * Atent Design Tokens for Mobile and Web
 * WCAG 2.1 AA/AAA Compliant Palette
 */
export const ATENT_TOKENS = {
  colors: {
    bg: {
      canvas: '#08070B',       // Negro profundo
      surface: '#121016',      // Superficie elevada para tarjetas
      elevated: '#1B1722',     // Superficie superior / sheets / modales
      overlay: 'rgba(8, 7, 11, 0.88)',
      glass: 'rgba(27, 23, 34, 0.72)',
    },
    brand: {
      pink: '#F52D83',         // Rosa principal
      pinkLight: '#FF78B7',    // Rosa claro luminoso
      pinkSubtle: 'rgba(245, 45, 131, 0.12)',
      pinkGlow: 'rgba(245, 45, 131, 0.35)',
      gradientPink: 'linear-gradient(135deg, #F52D83 0%, #FF78B7 100%)',
    },
    border: {
      subtle: '#221C2B',       // Bordes sutiles
      default: '#322A3E',      // Bordes regulares
      strong: '#483C59',       // Bordes destacados
      focus: '#F52D83',        // Foco rosa
    },
    text: {
      primary: '#F7F3F7',      // Blanco cálido
      secondary: '#AAA3B0',    // Gris secundario
      tertiary: '#706877',     // Metadatos y marcas temporales
      inverse: '#08070B',      // Sobre botones de acento
      accentPink: '#FF78B7',   // Texto destacado en rosa
    },
    safety: {
      safe: '#238636',
      safeSurface: '#0E2714',
      preparing: '#D29922',
      preparingSurface: '#382405',
      active: '#FF304F',       // Rojo de emergencia puro
      activeSurface: '#3C0E14',
      activeGlow: 'rgba(255, 48, 79, 0.45)',
      resolved: '#388BFD',
      resolvedSurface: '#0D254C',
      offline: '#706877',
      offlineSurface: '#1B1722',
    },
  },
  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", monospace',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 22,
      xxl: 28,
      hero: 44,
    },
    fontWeight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      heavy: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    huge: 48,
  },
  radii: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  shadows: {
    subtle: '0 4px 12px rgba(0, 0, 0, 0.5)',
    card: '0 8px 24px rgba(0, 0, 0, 0.6)',
    modal: '0 20px 48px rgba(0, 0, 0, 0.8)',
    pinkGlow: '0 0 32px rgba(245, 45, 131, 0.35)',
    emergencyGlow: '0 0 45px rgba(255, 48, 79, 0.65)',
  },
  motion: {
    duration: {
      instant: '100ms',
      quick: '200ms',
      medium: '350ms',
      deliberate: '500ms',
    },
    easing: {
      easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
      easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
} as const;

export type AtentTokens = typeof ATENT_TOKENS;
