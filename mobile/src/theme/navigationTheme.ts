import { Theme } from "@react-navigation/native";
import { ThemeColors } from "./colors";

export function getNavigationTheme(colors: ThemeColors, options?: { fontFamily?: string }): Theme {
  const fontFamily = options?.fontFamily ?? "System";
  return {
    dark: false,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent
    },
    fonts: {
      regular: {
        fontFamily,
        fontWeight: "400"
      },
      medium: {
        fontFamily,
        fontWeight: "500"
      },
      bold: {
        fontFamily,
        fontWeight: "700"
      },
      heavy: {
        fontFamily,
        fontWeight: "800"
      }
    }
  };
}
