/**
 * FILE: app/(tabs)/reports.tsx
 * ROLE: Reports tab — shows all generated discrepancy reports.
 * WHY: After a comparison is run (Stage 4), the user needs a persistent
 *      list of all reports they can return to. Each report links back to
 *      the documents that produced it and to the evidence for each flag.
 *
 * STAGE 1: Correct empty state. Report list and detail navigation wired in Stage 5.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

function ReportsEmptyState() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconRing, { borderColor: C.border }]}>
        <Feather name="alert-triangle" size={36} color={C.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.text }]}>No reports yet</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
        Import both an official bill and a landlord charge sheet, then run a comparison to generate your first discrepancy report.
      </Text>
      <View style={[styles.stepsList, { borderColor: C.border }]}>
        {[
          { n: "1", label: "Import an official utility bill" },
          { n: "2", label: "Import the landlord charge sheet" },
          { n: "3", label: "Review and correct OCR fields" },
          { n: "4", label: "Run comparison to detect discrepancies" },
        ].map((step) => (
          <View key={step.n} style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: C.primarySubtle }]}>
              <Text style={[styles.stepNum, { color: C.primary }]}>{step.n}</Text>
            </View>
            <Text style={[styles.stepLabel, { color: C.textSecondary }]}>{step.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const reports: unknown[] = [];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={
          colorScheme === "dark"
            ? [Colors.dark.navy800, Colors.dark.background]
            : ["#EFF6FF", C.background]
        }
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top + 12 },
        ]}
      >
        <Text style={[styles.headerTitle, { color: C.text }]}>Reports</Text>
        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
          Discrepancy comparison results
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {reports.length === 0 ? <ReportsEmptyState /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingHorizontal: 16 },
  emptyContainer: { alignItems: "center", paddingTop: 32, paddingHorizontal: 24, gap: 12 },
  emptyIconRing: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular",
    textAlign: "center", lineHeight: 20,
  },
  stepsList: {
    width: "100%", borderRadius: 14, borderWidth: 1, overflow: "hidden", marginTop: 8,
  },
  stepRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderBottomWidth: 0,
  },
  stepBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  stepNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  stepLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
});
