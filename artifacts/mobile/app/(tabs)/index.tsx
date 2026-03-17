/**
 * FILE: app/(tabs)/index.tsx
 * ROLE: Dashboard tab — the first screen users see.
 * WHY: The dashboard answers "where am I?" at a glance:
 *   - How many bills have been verified?
 *   - How much has the landlord overcharged in total?
 *   - What is the trend of my utility usage?
 *   - What needs attention right now?
 *
 * SCREEN STATES:
 * - Empty: first-time user, no bills imported yet
 * - Loaded: shows stat cards and a usage trend placeholder
 *
 * WHY no live data in Stage 1: The backend extraction and comparison
 * pipelines are not built yet (Stages 2–4). The dashboard shows correct
 * structure with empty states so the navigation and design are validated
 * before the data layer exists.
 */

import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

// ---------------------------------------------------------------------------
// Stat card component
// ---------------------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  accent?: "neutral" | "danger" | "success" | "warning";
  icon: React.ReactNode;
}

function StatCard({ label, value, subtext, accent = "neutral", icon }: StatCardProps) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;

  const accentColors = {
    neutral: C.primary,
    danger: C.flagHigh,
    success: C.flagLow,
    warning: C.flagMedium,
  };

  return (
    <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.cardShadow }]}>
      <View style={[styles.cardIconBg, { backgroundColor: accentColors[accent] + "20" }]}>
        {icon}
      </View>
      <Text style={[styles.cardValue, { color: accentColors[accent] }]}>{value}</Text>
      <Text style={[styles.cardLabel, { color: C.text }]}>{label}</Text>
      {subtext ? (
        <Text style={[styles.cardSubtext, { color: C.textMuted }]}>{subtext}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state component — shown when no bills have been imported
// ---------------------------------------------------------------------------
function EmptyState({ onImport }: { onImport: () => void }) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;

  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconRing, { borderColor: C.border }]}>
        <Ionicons name="document-text-outline" size={40} color={C.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.text }]}>No bills verified yet</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
        Import your first utility bill or landlord charge sheet to get started.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.emptyButton,
          { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={onImport}
        testID="empty-import-button"
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.emptyButtonText}>Import a Bill</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard screen
// ---------------------------------------------------------------------------
export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  // WHY stub data: Backend not built yet. These values will come from a
  // React Query hook (useQuery) in Stage 5 when the comparison API exists.
  const stats = {
    billsVerified: 0,
    totalOvercharge: "HK$0",
    avgConfidence: "—",
    reportsGenerated: 0,
  };

  const hasData = stats.billsVerified > 0;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <LinearGradient
        colors={
          colorScheme === "dark"
            ? [Colors.dark.navy800, Colors.dark.background]
            : ["#EFF6FF", C.background]
        }
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === "web" ? 67 : insets.top + 12,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerGreeting, { color: C.textSecondary }]}>
              Utility Bill Verifier
            </Text>
            <Text style={[styles.headerTitle, { color: C.text }]}>Dashboard</Text>
          </View>
          <Pressable
            style={[styles.addButton, { backgroundColor: C.primary }]}
            onPress={() => router.push("/(tabs)/bills")}
            testID="header-add-button"
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Bills Verified"
            value={String(stats.billsVerified)}
            subtext="official + landlord"
            icon={<Ionicons name="document-text" size={20} color={Colors.dark.primary} />}
          />
          <StatCard
            label="Total Overcharge"
            value={stats.totalOvercharge}
            subtext="across all reports"
            accent="danger"
            icon={<Ionicons name="warning" size={20} color={Colors.dark.flagHigh} />}
          />
          <StatCard
            label="Reports"
            value={String(stats.reportsGenerated)}
            subtext="comparisons run"
            accent="success"
            icon={<Feather name="bar-chart-2" size={20} color={Colors.dark.flagLow} />}
          />
          <StatCard
            label="Avg Confidence"
            value={stats.avgConfidence}
            subtext="OCR accuracy"
            accent="warning"
            icon={<Feather name="zap" size={20} color={Colors.dark.flagMedium} />}
          />
        </View>

        {/* HK context banner */}
        <View style={[styles.banner, { backgroundColor: C.primarySubtle, borderColor: C.primary + "40" }]}>
          <Ionicons name="information-circle" size={18} color={C.primary} />
          <Text style={[styles.bannerText, { color: C.primary }]}>
            Configured for Hong Kong electricity, water & gas billing rules (CLP, HK Electric, WSD).
          </Text>
        </View>

        {/* Empty or data state */}
        {!hasData ? (
          <EmptyState onImport={() => router.push("/(tabs)/bills")} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerGreeting: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  cardSubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
