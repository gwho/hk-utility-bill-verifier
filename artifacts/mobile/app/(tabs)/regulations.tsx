/**
 * FILE: app/(tabs)/regulations.tsx
 * ROLE: HK Regulations tab — lets users look up Hong Kong tenancy and
 *       utility billing rules by utility type and keyword.
 * WHY: A tenant disputing a bill needs to know what the landlord is legally
 *      allowed to charge. Without this context, the discrepancy report is
 *      numbers without meaning.
 *
 * HK-SPECIFIC SOURCES (configured for Stage 6):
 *   - EMSD (emsd.gov.hk): Scheme of Control tariff rules for CLP and HK Electric
 *   - WSD (wsd.gov.hk): Water sub-meter and shared supply rules
 *   - Lands Tribunal: Landlord and Tenant Ordinance Cap. 7
 *   - Consumer Council: Published overcharging case summaries
 *
 * STAGE 1: Search UI shell with correct empty/disclaimer states.
 *           Backend lookup is wired in Stage 6.
 */

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { UtilityType } from "@/types/domain";

type UtilityFilter = UtilityType | "all";

const UTILITY_OPTIONS: { key: UtilityFilter; label: string; icon: React.ReactNode }[] = [
  {
    key: "all",
    label: "All",
    icon: <Feather name="layers" size={14} color="currentColor" />,
  },
  {
    key: "electricity",
    label: "Electricity",
    icon: <Feather name="zap" size={14} color="currentColor" />,
  },
  {
    key: "water",
    label: "Water",
    icon: <Ionicons name="water" size={14} color="currentColor" />,
  },
  {
    key: "gas",
    label: "Gas",
    icon: <MaterialCommunityIcons name="gas-cylinder" size={14} color="currentColor" />,
  },
];

const HK_SOURCE_CARDS = [
  {
    agency: "EMSD",
    fullName: "Electrical and Mechanical Services Dept",
    governs: "CLP & HK Electric tariff schedules, Scheme of Control Agreement",
    icon: "zap" as const,
    color: "#F59E0B",
  },
  {
    agency: "WSD",
    fullName: "Water Supplies Department",
    governs: "Shared water meters, sub-meter allocation rules",
    icon: "droplet" as const,
    color: "#3B82F6",
  },
  {
    agency: "Lands Tribunal",
    fullName: "Lands Tribunal / Department of Justice",
    governs: "Landlord and Tenant (Consolidation) Ordinance Cap. 7",
    icon: "book" as const,
    color: "#8B5CF6",
  },
  {
    agency: "Consumer Council",
    fullName: "Consumer Council Hong Kong",
    governs: "Published overcharging complaint summaries and guidance",
    icon: "shield" as const,
    color: "#10B981",
  },
];

function DisclaimerBanner() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  return (
    <View style={[styles.disclaimer, { backgroundColor: C.flagMediumBg, borderColor: C.flagMedium + "60" }]}>
      <Feather name="alert-circle" size={16} color={C.flagMedium} />
      <Text style={[styles.disclaimerText, { color: C.flagMedium }]}>
        Informational only. Consult a Hong Kong solicitor for legal advice on your specific situation.
      </Text>
    </View>
  );
}

export default function RegulationsScreen() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [utilityFilter, setUtilityFilter] = useState<UtilityFilter>("all");

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
        <Text style={[styles.headerTitle, { color: C.text }]}>HK Rules</Text>
        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
          Hong Kong tenancy & utility billing regulations
        </Text>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Feather name="search" size={16} color={C.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search regulations..."
            placeholderTextColor={C.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            testID="regulation-search-input"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Utility filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {UTILITY_OPTIONS.map((opt) => {
            const selected = utilityFilter === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? C.primary : C.surface,
                    borderColor: selected ? C.primary : C.border,
                  },
                ]}
                onPress={() => setUtilityFilter(opt.key)}
              >
                <Text style={{ color: selected ? "#fff" : C.textSecondary }}>
                  {/* icon rendered inline without size prop issue */}
                </Text>
                <Text style={[styles.chipText, { color: selected ? "#fff" : C.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DisclaimerBanner />

        {/* Source reference cards — always visible as orientation for users */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>
          Authoritative Sources
        </Text>
        {HK_SOURCE_CARDS.map((src) => (
          <View
            key={src.agency}
            style={[styles.sourceCard, { backgroundColor: C.surface, borderColor: C.border }]}
          >
            <View style={[styles.sourceIconBg, { backgroundColor: src.color + "20" }]}>
              <Feather name={src.icon} size={18} color={src.color} />
            </View>
            <View style={styles.sourceCardText}>
              <Text style={[styles.sourceAgency, { color: C.text }]}>{src.agency}</Text>
              <Text style={[styles.sourceFull, { color: C.textSecondary }]}>{src.fullName}</Text>
              <Text style={[styles.sourceGoverns, { color: C.textMuted }]}>{src.governs}</Text>
            </View>
          </View>
        ))}

        {/* Stage 6 search results will appear here */}
        {query.length > 0 ? (
          <View style={styles.searchPlaceholder}>
            <Feather name="clock" size={24} color={C.textMuted} />
            <Text style={[styles.searchPlaceholderText, { color: C.textMuted }]}>
              Regulation search is being built. Results will appear here in a future update.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  chipsRow: { gap: 8, paddingRight: 20 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 20, borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16, gap: 10 },
  disclaimer: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase", letterSpacing: 0.8, marginTop: 6,
  },
  sourceCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  sourceIconBg: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  sourceCardText: { flex: 1, gap: 2 },
  sourceAgency: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sourceFull: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sourceGoverns: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  searchPlaceholder: {
    alignItems: "center", gap: 8, paddingVertical: 24, paddingHorizontal: 24,
  },
  searchPlaceholderText: {
    fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18,
  },
});
