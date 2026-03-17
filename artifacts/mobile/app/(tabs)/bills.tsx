/**
 * FILE: app/(tabs)/bills.tsx
 * ROLE: Bills tab — shows all imported documents and lets user add new ones.
 * WHY: The bills list is the entry point for the verification workflow:
 *   Import bill → OCR → review → run comparison → see report.
 *
 * STAGES: This screen shows correct empty state in Stage 1.
 * Document list and upload trigger are wired in Stage 2.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { DocumentType, UtilityType } from "@/types/domain";

// ---------------------------------------------------------------------------
// Document type selector chip
// ---------------------------------------------------------------------------
interface DocTypeChipProps {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}

function DocTypeChip({ label, icon, selected, onPress }: DocTypeChipProps) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  return (
    <Pressable
      style={[
        styles.chip,
        {
          backgroundColor: selected ? C.primary : C.surface,
          borderColor: selected ? C.primary : C.border,
        },
      ]}
      onPress={onPress}
    >
      {icon}
      <Text
        style={[
          styles.chipText,
          { color: selected ? "#fff" : C.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function BillsEmptyState({ onAdd }: { onAdd: () => void }) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconRing, { borderColor: C.border }]}>
        <Feather name="file-text" size={36} color={C.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: C.text }]}>No bills imported</Text>
      <Text style={[styles.emptySubtitle, { color: C.textSecondary }]}>
        Scan or import an official CLP, HK Electric, or WSD bill — or a landlord charge sheet.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.importButton,
          { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={onAdd}
        testID="bills-import-button"
      >
        <Feather name="camera" size={18} color="#fff" />
        <Text style={styles.importButtonText}>Scan or Import</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Bills screen
// ---------------------------------------------------------------------------
export default function BillsScreen() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = React.useState<"all" | DocumentType>("all");

  // Stage 2 will replace this with a React Query hook
  const documents: unknown[] = [];

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
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: C.text }]}>Bills</Text>
          <Pressable
            style={[styles.addButton, { backgroundColor: C.primary }]}
            onPress={() => {
              /* Stage 2: open ScanOrImportSheet */
            }}
            testID="add-bill-button"
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <DocTypeChip
            label="All"
            selected={filter === "all"}
            onPress={() => setFilter("all")}
            icon={<Feather name="layers" size={14} color={filter === "all" ? "#fff" : C.textSecondary} />}
          />
          <DocTypeChip
            label="Official Bills"
            selected={filter === "official_bill"}
            onPress={() => setFilter("official_bill")}
            icon={<Feather name="zap" size={14} color={filter === "official_bill" ? "#fff" : C.textSecondary} />}
          />
          <DocTypeChip
            label="Landlord Sheets"
            selected={filter === "landlord_sheet"}
            onPress={() => setFilter("landlord_sheet")}
            icon={<Feather name="home" size={14} color={filter === "landlord_sheet" ? "#fff" : C.textSecondary} />}
          />
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
        {documents.length === 0 ? (
          <BillsEmptyState
            onAdd={() => {
              /* Stage 2: open scanner */
            }}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  chipsRow: { gap: 8, paddingRight: 20 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 24, paddingHorizontal: 16 },
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
  importButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  importButtonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
