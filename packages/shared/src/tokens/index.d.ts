/**
 * Atent Design Tokens for Mobile and Web
 * WCAG 2.1 AA/AAA Compliant Palette
 */
export declare const ATENT_TOKENS: {
    readonly colors: {
        readonly bg: {
            readonly canvas: "#0c0f14";
            readonly surface: "#161b22";
            readonly elevated: "#21262d";
            readonly overlay: "rgba(12, 15, 20, 0.85)";
        };
        readonly border: {
            readonly subtle: "#30363d";
            readonly strong: "#484f58";
            readonly focus: "#58a6ff";
        };
        readonly text: {
            readonly primary: "#f0f6fc";
            readonly secondary: "#8b949e";
            readonly tertiary: "#6e7681";
            readonly inverse: "#0d1117";
        };
        readonly safety: {
            readonly safe: "#238636";
            readonly safeSurface: "#0e2714";
            readonly preparing: "#d29922";
            readonly preparingSurface: "#382405";
            readonly active: "#da3633";
            readonly activeSurface: "#3c1110";
            readonly resolved: "#1f6feb";
            readonly resolvedSurface: "#0d254c";
            readonly offline: "#6e7681";
            readonly offlineSurface: "#21262d";
        };
    };
    readonly typography: {
        readonly fontFamily: {
            readonly base: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif";
            readonly mono: "\"SF Mono\", Monaco, \"Cascadia Code\", monospace";
        };
        readonly fontSize: {
            readonly xs: 12;
            readonly sm: 14;
            readonly md: 16;
            readonly lg: 18;
            readonly xl: 22;
            readonly xxl: 28;
            readonly hero: 44;
        };
        readonly fontWeight: {
            readonly regular: "400";
            readonly medium: "500";
            readonly semibold: "600";
            readonly bold: "700";
        };
        readonly lineHeight: {
            readonly tight: 1.2;
            readonly normal: 1.5;
            readonly relaxed: 1.75;
        };
    };
    readonly spacing: {
        readonly xs: 4;
        readonly sm: 8;
        readonly md: 12;
        readonly lg: 16;
        readonly xl: 24;
        readonly xxl: 32;
        readonly huge: 48;
    };
    readonly radii: {
        readonly xs: 4;
        readonly sm: 6;
        readonly md: 12;
        readonly lg: 16;
        readonly full: 9999;
    };
};
export type AtentTokens = typeof ATENT_TOKENS;
//# sourceMappingURL=index.d.ts.map