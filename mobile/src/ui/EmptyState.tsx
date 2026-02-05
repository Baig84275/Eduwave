import React from "react";
import { View } from "react-native";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { Card } from "./Card";
import { AppText } from "./Text";

export function EmptyState({
  title,
  message,
  action
}: {
  title: string;
  message?: string | null;
  action?: React.ReactNode;
}) {
  const { config } = useAccessibility();
  const colors = config.color.colors;

  return (
    <Card style={{ backgroundColor: colors.surfaceAlt }}>
      <View style={{ gap: 8 }}>
        <AppText variant="body" weight="black">
          {title}
        </AppText>
        {message ? (
          <AppText variant="body" tone="muted">
            {message}
          </AppText>
        ) : null}
        {action ? <View style={{ marginTop: 4 }}>{action}</View> : null}
      </View>
    </Card>
  );
}

