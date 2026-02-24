import React from "react";
import {
  Clipboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

/**
 * ErrorBoundary — catches any unhandled React render/lifecycle error and
 * displays a readable dev screen instead of a blank crash.
 *
 * Wrap the root of the app with this so every screen is protected.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, componentStack: null, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
    // Also log to the Metro / adb logcat terminal
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  private handleCopy = () => {
    const { error, componentStack } = this.state;
    const text = [
      `ERROR: ${error?.message ?? "Unknown"}`,
      "",
      "JS Stack:",
      error?.stack ?? "(no stack)",
      "",
      "Component Stack:",
      componentStack ?? "(none)",
    ].join("\n");
    Clipboard.setString(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleRetry = () => {
    this.setState({ error: null, componentStack: null, copied: false });
  };

  render() {
    const { error, componentStack, copied } = this.state;
    if (!error) return this.props.children;

    const shortMessage = error.message ?? "Unknown error";
    const jsStack = (error.stack ?? "")
      // trim leading "Error: message" line so we don't repeat it
      .replace(/^.*?\n/, "")
      .trim();

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Txt style={styles.badgeText}>RUNTIME ERROR</Txt>
          </View>
          <Txt style={styles.title}>{shortMessage}</Txt>
        </View>

        {/* Scrollable details */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {jsStack ? (
            <>
              <Txt style={styles.sectionLabel}>JS STACK</Txt>
              <Txt style={styles.stack}>{jsStack}</Txt>
            </>
          ) : null}

          {componentStack ? (
            <>
              <Txt style={styles.sectionLabel}>COMPONENT TREE</Txt>
              <Txt style={styles.stack}>{componentStack.trim()}</Txt>
            </>
          ) : null}
        </ScrollView>

        {/* Footer actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={this.handleCopy}
            activeOpacity={0.75}
          >
            <Txt style={styles.btnSecondaryText}>
              {copied ? "Copied!" : "Copy error"}
            </Txt>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={this.handleRetry}
            activeOpacity={0.75}
          >
            <Txt style={styles.btnPrimaryText}>Retry</Txt>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

// Minimal local Text to avoid depending on the app theme
// (the theme providers may themselves be broken when this renders)
function Txt({ style, children }: { style?: any; children?: React.ReactNode }) {
  const { Text } = require("react-native");
  return <Text style={style}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    gap: 10,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#EF4444",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: "monospace",
  },
  title: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "monospace",
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  stack: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 17,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#3B82F6",
  },
  btnSecondary: {
    backgroundColor: "#1E293B",
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondaryText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 14,
  },
});
