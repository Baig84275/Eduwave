/**
 * DatePickerField
 * A pressable field that opens a full modal calendar.
 * Zero external dependencies — uses only built-in RN components.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAccessibility } from "../accessibility/AccessibilityProvider";
import { AppText } from "./Text";
import { tokens } from "../theme/tokens";
import { haptics } from "../animation";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const CELL_SIZE = Math.floor((Dimensions.get("window").width - 64 - 12) / 7);
const YEAR_ITEM_HEIGHT = 44;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatHeaderFull(date: Date): string {
  return date.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type GridCell = {
  day: number;
  month: number;
  year: number;
  current: boolean; // belongs to the displayed month
};

function buildGrid(year: number, month: number): GridCell[] {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevDays = daysInMonth(prevYear, prevMonth);

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const cells: GridCell[] = [];

  // Leading days from prev month
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, month: prevMonth, year: prevYear, current: false });
  }
  // Current month
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, month, year, current: true });
  }
  // Trailing days
  const trailing = 42 - cells.length;
  for (let d = 1; d <= trailing; d++) {
    cells.push({ day: d, month: nextMonth, year: nextYear, current: false });
  }

  return cells;
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface DatePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  /** Dates before minDate are disabled */
  minDate?: Date;
  /** Dates after maxDate are disabled */
  maxDate?: Date;
  placeholder?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  error,
  containerStyle,
}: DatePickerFieldProps) {
  const { config } = useAccessibility();
  const colors = config.color.colors;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Modal state
  const [open, setOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Year list scroll ref — used to jump to selected year
  const yearScrollRef = useRef<ScrollView>(null);

  // Year range: 130 years back, 10 years forward
  const currentYear = today.getFullYear();
  const minYear = currentYear - 130;
  const maxYear = currentYear + 10;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // ── Open / close ──────────────────────────────────────────────────────────

  const openPicker = useCallback(() => {
    haptics.light();
    const init = value ?? today;
    setViewMonth(init.getMonth());
    setViewYear(init.getFullYear());
    setPendingDate(value ? new Date(value) : null);
    setShowYearPicker(false);
    setOpen(true);
  }, [value, today]);

  const closePicker = useCallback(() => {
    setOpen(false);
    setShowYearPicker(false);
  }, []);

  const confirm = useCallback(() => {
    if (pendingDate) onChange(pendingDate);
    closePicker();
  }, [pendingDate, onChange, closePicker]);

  // ── Month navigation ──────────────────────────────────────────────────────

  const goToPrevMonth = useCallback(() => {
    haptics.selection();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    haptics.selection();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  // ── Year picker ───────────────────────────────────────────────────────────

  const openYearPicker = useCallback(() => {
    haptics.light();
    setShowYearPicker(true);
    // Scroll to selected year after a short delay (let the view render first)
    setTimeout(() => {
      const idx = years.indexOf(viewYear);
      if (idx >= 0 && yearScrollRef.current) {
        const offset = Math.max(0, idx * YEAR_ITEM_HEIGHT - 100);
        yearScrollRef.current.scrollTo({ y: offset, animated: false });
      }
    }, 50);
  }, [viewYear, years]);

  const selectYear = useCallback((y: number) => {
    haptics.selection();
    setViewYear(y);
    setShowYearPicker(false);
  }, []);

  // ── Day selection ─────────────────────────────────────────────────────────

  const selectDay = useCallback(
    (cell: GridCell) => {
      const date = new Date(cell.year, cell.month, cell.day);
      date.setHours(0, 0, 0, 0);
      if (minDate && date < minDate) return;
      if (maxDate && date > maxDate) return;
      haptics.selection();
      setPendingDate(date);
      if (!cell.current) {
        setViewMonth(cell.month);
        setViewYear(cell.year);
      }
    },
    [minDate, maxDate]
  );

  const isDisabledDate = useCallback(
    (cell: GridCell) => {
      const date = new Date(cell.year, cell.month, cell.day);
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    },
    [minDate, maxDate]
  );

  // ── Trigger field appearance ──────────────────────────────────────────────

  const hasValue = value !== null;
  const borderColor = error
    ? colors.danger
    : open
      ? colors.focusRing
      : colors.border;

  const grid = buildGrid(viewYear, viewMonth);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Trigger field */}
      <Pressable
        onPress={openPicker}
        style={[
          styles.trigger,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: error || open ? 2 : 1,
            borderRadius: tokens.radius.lg,
            minHeight: tokens.components.input.height,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={value ? formatDisplay(value) : placeholder}
      >
        {/* Floating label */}
        <AppText
          variant="caption"
          style={[
            styles.floatingLabel,
            {
              color: error ? colors.danger : hasValue ? colors.primary : colors.textMuted,
              top: hasValue ? 6 : undefined,
              fontSize: hasValue
                ? 11 * config.typography.fontScale
                : 14 * config.typography.fontScale,
            },
          ]}
        >
          {label}
        </AppText>

        <View style={[styles.triggerContent, { paddingTop: hasValue ? 18 : 0 }]}>
          <AppText
            variant="body"
            style={{ flex: 1, color: hasValue ? colors.text : colors.textMuted }}
          >
            {hasValue ? formatDisplay(value!) : placeholder}
          </AppText>
          <MaterialCommunityIcons
            name="calendar-month"
            size={20}
            color={open ? colors.primary : colors.textMuted}
          />
        </View>
      </Pressable>

      {/* Error text */}
      {error ? (
        <AppText
          variant="caption"
          tone="danger"
          weight="semibold"
          style={{ marginTop: tokens.spacing.xs }}
        >
          {error}
        </AppText>
      ) : null}

      {/* ── Modal ── */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={closePicker}>
          {/* Calendar card — stop press events from bubbling to overlay */}
          <Pressable
            style={[
              styles.calendarCard,
              { backgroundColor: colors.surface },
            ]}
            onPress={() => {}}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <View style={[styles.calendarHeader, { backgroundColor: colors.primary }]}>
              <AppText
                variant="caption"
                weight="semibold"
                style={{ color: "rgba(255,255,255,0.75)", letterSpacing: 0.5 }}
              >
                {label.toUpperCase()}
              </AppText>
              <AppText
                variant="h3"
                weight="bold"
                style={{ color: "#FFFFFF", marginTop: 4 }}
              >
                {pendingDate ? formatHeaderFull(pendingDate) : "No date selected"}
              </AppText>
            </View>

            {showYearPicker ? (
              // ── Year picker ──────────────────────────────────
              <View style={styles.yearPickerContainer}>
                <View
                  style={[
                    styles.yearPickerTitle,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Pressable onPress={() => setShowYearPicker(false)} hitSlop={8}>
                    <MaterialCommunityIcons
                      name="arrow-left"
                      size={20}
                      color={colors.primary}
                    />
                  </Pressable>
                  <AppText variant="label" weight="bold">
                    Select Year
                  </AppText>
                  <View style={{ width: 20 }} />
                </View>

                <ScrollView
                  ref={yearScrollRef}
                  style={styles.yearList}
                  showsVerticalScrollIndicator={false}
                >
                  {years.map((y) => {
                    const selected = y === viewYear;
                    return (
                      <Pressable
                        key={y}
                        onPress={() => selectYear(y)}
                        style={[
                          styles.yearItem,
                          selected && {
                            backgroundColor: colors.primary,
                            borderRadius: tokens.radius.md,
                          },
                        ]}
                      >
                        <AppText
                          variant="body"
                          weight={selected ? "bold" : "regular"}
                          style={{ color: selected ? "#FFFFFF" : colors.text }}
                        >
                          {y}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              // ── Calendar grid ────────────────────────────────
              <View style={styles.calendarBody}>
                {/* Month navigation */}
                <View style={[styles.monthNav, { borderBottomColor: colors.border }]}>
                  <Pressable
                    onPress={goToPrevMonth}
                    style={styles.navArrow}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={24}
                      color={colors.primary}
                    />
                  </Pressable>

                  <Pressable
                    onPress={openYearPicker}
                    style={styles.monthYearBtn}
                    accessibilityLabel="Select year"
                  >
                    <AppText variant="body" weight="bold" style={{ color: colors.text }}>
                      {MONTHS_LONG[viewMonth]} {viewYear}
                    </AppText>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={16}
                      color={colors.textMuted}
                      style={{ marginLeft: 2 }}
                    />
                  </Pressable>

                  <Pressable
                    onPress={goToNextMonth}
                    style={styles.navArrow}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.primary}
                    />
                  </Pressable>
                </View>

                {/* Day-of-week labels */}
                <View style={styles.dayLabels}>
                  {DAY_LABELS.map((d) => (
                    <View key={d} style={[styles.dayLabelCell, { width: CELL_SIZE }]}>
                      <AppText
                        variant="caption"
                        weight="semibold"
                        style={{ color: colors.textMuted, fontSize: 11 }}
                      >
                        {d}
                      </AppText>
                    </View>
                  ))}
                </View>

                {/* Calendar cells */}
                <View style={styles.grid}>
                  {grid.map((cell, idx) => {
                    const cellDate = new Date(cell.year, cell.month, cell.day);
                    const isSelected = pendingDate ? sameDay(cellDate, pendingDate) : false;
                    const isToday = sameDay(cellDate, today);
                    const disabled = isDisabledDate(cell);

                    return (
                      <Pressable
                        key={idx}
                        onPress={() => !disabled && selectDay(cell)}
                        disabled={disabled}
                        style={[
                          styles.dayCell,
                          { width: CELL_SIZE, height: CELL_SIZE },
                          isSelected && {
                            backgroundColor: colors.primary,
                            borderRadius: CELL_SIZE / 2,
                          },
                          !isSelected && isToday && {
                            borderRadius: CELL_SIZE / 2,
                            borderWidth: 1.5,
                            borderColor: colors.primary,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${cell.day} ${MONTHS_SHORT[cell.month]} ${cell.year}`}
                        accessibilityState={{ selected: isSelected, disabled }}
                      >
                        <AppText
                          style={{
                            fontSize: 13 * config.typography.fontScale,
                            fontWeight: isSelected || isToday ? "700" : "400",
                            color: isSelected
                              ? "#FFFFFF"
                              : disabled
                                ? colors.border
                                : !cell.current
                                  ? colors.borderLight
                                  : isToday
                                    ? colors.primary
                                    : colors.text,
                          }}
                        >
                          {cell.day}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Month shortcut row */}
                <View style={[styles.monthShortcuts, { borderTopColor: colors.border }]}>
                  {MONTHS_SHORT.map((m, idx) => {
                    const active = idx === viewMonth;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => {
                          haptics.selection();
                          setViewMonth(idx);
                        }}
                        style={[
                          styles.monthShortcutBtn,
                          active && {
                            backgroundColor: colors.primaryLight + "30",
                            borderRadius: tokens.radius.sm,
                          },
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight={active ? "bold" : "regular"}
                          style={{
                            color: active ? colors.primary : colors.textMuted,
                            fontSize: 10 * config.typography.fontScale,
                          }}
                        >
                          {m}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Footer ─────────────────────────────────────── */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Pressable onPress={closePicker} style={styles.footerCancelBtn}>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: colors.textMuted }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={confirm}
                disabled={!pendingDate}
                style={[
                  styles.footerOkBtn,
                  {
                    backgroundColor: pendingDate ? colors.primary : colors.border,
                    borderRadius: tokens.radius.md,
                  },
                ]}
              >
                <AppText
                  variant="body"
                  weight="bold"
                  style={{ color: "#FFFFFF" }}
                >
                  Confirm
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD_WIDTH = Dimensions.get("window").width - 32;

const styles = StyleSheet.create({
  wrapper: {
    gap: tokens.spacing.xs,
  },

  // Trigger field
  trigger: {
    paddingHorizontal: tokens.components.input.paddingHorizontal,
    paddingVertical: tokens.spacing.sm,
    justifyContent: "center",
  },
  floatingLabel: {
    position: "absolute",
    left: tokens.components.input.paddingHorizontal,
  },
  triggerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },

  // Modal overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing.lg,
  },

  // Calendar card
  calendarCard: {
    width: CARD_WIDTH,
    borderRadius: tokens.radius.xl,
    overflow: "hidden",
  },

  // Header
  calendarHeader: {
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.xl,
    paddingBottom: tokens.spacing.lg,
  },

  // Body
  calendarBody: {
    paddingHorizontal: tokens.spacing.md,
  },

  // Month nav
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    marginBottom: tokens.spacing.sm,
  },
  navArrow: {
    padding: tokens.spacing.xs,
  },
  monthYearBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },

  // Day labels
  dayLabels: {
    flexDirection: "row",
    marginBottom: tokens.spacing.xs,
  },
  dayLabelCell: {
    alignItems: "center",
    paddingVertical: 2,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Month shortcut strip
  monthShortcuts: {
    flexDirection: "row",
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
    borderTopWidth: 1,
    gap: 2,
  },
  monthShortcutBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },

  // Year picker
  yearPickerContainer: {
    height: 260,
  },
  yearPickerTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: 1,
  },
  yearList: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
  },
  yearItem: {
    height: YEAR_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    borderTopWidth: 1,
  },
  footerCancelBtn: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  footerOkBtn: {
    paddingHorizontal: tokens.spacing.xl,
    paddingVertical: tokens.spacing.sm,
  },
});
