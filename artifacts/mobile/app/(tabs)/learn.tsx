/**
 * FILE: app/(tabs)/learn.tsx
 * ROLE: Learn tab — in-app architecture tutorial for the project.
 * WHY: This project is designed as a learning artifact. Every architectural
 *      decision, every stage of implementation, and every error encountered
 *      is documented here so a beginner can understand WHY things are built
 *      the way they are, not just WHAT was built.
 *
 * CONTENT STRATEGY: Tutorial content is bundled with the app (not fetched
 * from a server) so it works offline and doesn't require a network call.
 * Content is stored in a local constant — in a future stage it will be
 * loaded from the docs/ markdown files at build time.
 *
 * TUTORIAL CONCEPT (meta): This screen itself demonstrates a pattern —
 * "accordion-style" expandable sections are a native mobile pattern for
 * dense information. Compare to Settings apps on iOS.
 */

import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Animated,
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

// ---------------------------------------------------------------------------
// Tutorial content data
// ---------------------------------------------------------------------------
interface TutorialSection {
  id: string;
  stage: string;
  title: string;
  status: "done" | "in-progress" | "upcoming";
  summary: string;
  keyDecisions: string[];
  concepts: string[];
}

const TUTORIAL_SECTIONS: TutorialSection[] = [
  {
    id: "stage-1",
    stage: "Stage 1",
    title: "Foundation: App & Backend Scaffold",
    status: "in-progress",
    summary:
      "Sets up the Expo mobile app with 5 tabs, the Python FastAPI backend with all domain models, the PostgreSQL database schema, and the Express proxy that connects everything together.",
    keyDecisions: [
      "ADR-001: SwiftUI → Expo Router for cross-platform reach and faster iteration",
      "ADR-002: Python/FastAPI for backend (OCR + billing logic) vs keeping everything in Node.js",
      "ADR-003: FieldWithSource<T> wraps every extracted value to preserve OCR provenance",
      "ADR-005: Corrections table is append-only (immutable audit log) for evidentiary integrity",
    ],
    concepts: [
      "What is a domain model and why does it matter?",
      "What is provenance and why does every extracted field carry it?",
      "How does the Express proxy connect the iOS app to the Python backend?",
      "Why do we separate ORM models (SQLAlchemy) from business models (Pydantic)?",
    ],
  },
  {
    id: "stage-2",
    stage: "Stage 2",
    title: "Document Ingestion + OCR Pipeline",
    status: "upcoming",
    summary:
      "Adds camera scanning and photo import to the app, uploads documents to the backend, and runs async OCR extraction with FieldWithSource provenance on every field.",
    keyDecisions: [
      "ADR-006: iOS app polls for OCR status instead of WebSockets (simpler, more reliable over mobile networks)",
      "WHY async jobs: OCR can take 5–30 seconds; blocking the HTTP request would time out",
    ],
    concepts: [
      "What is OCR and why does it make mistakes?",
      "What is an async job queue and how does polling work?",
      "Why must every extracted number carry a confidence score?",
    ],
  },
  {
    id: "stage-3",
    stage: "Stage 3",
    title: "Extraction Review + Manual Correction",
    status: "upcoming",
    summary:
      "Shows every extracted field with a confidence badge (green/amber/red) and lets users correct any field before running a comparison. All corrections are logged immutably.",
    keyDecisions: [
      "WHY human review is mandatory: OCR has 5–15% error rate on photographed bills",
      "WHY corrections are append-only: every prior value must be preserved for audit trail",
    ],
    concepts: [
      "What is an immutable audit log and why does it matter for evidence?",
      "What does confidence 0.7 mean in practice?",
      "What is optimistic UI update and why does it feel snappier?",
    ],
  },
  {
    id: "stage-4",
    stage: "Stage 4",
    title: "Billing Engine + Discrepancy Detection",
    status: "upcoming",
    summary:
      "The core domain logic: computes expected tenant charge from rate tiers and allocation method, compares to landlord's charge, and produces a DiscrepancyReport with every flag traced to evidence.",
    keyDecisions: [
      "ADR-004: Billing math is deterministic — no inference or probability, only arithmetic",
      "WHY deterministic: a discrepancy report must be reproducible and explainable in a tribunal",
      "WHY block rate tiers need special care: usage must be allocated correctly across tier boundaries",
    ],
    concepts: [
      "What are block rate tiers and how does CLP charge electricity in HK?",
      "What does allocation method mean in a multi-unit building?",
      "What is a deterministic system vs an inferential system?",
      "How do unit tests ensure billing math is correct?",
    ],
  },
  {
    id: "stage-5",
    stage: "Stage 5",
    title: "Reports UI + Dashboard + PDF Export",
    status: "upcoming",
    summary:
      "Presents discrepancy reports in a readable format with evidence links, builds the trend chart dashboard, and generates PDFs with evidence image crops and provenance footnotes.",
    keyDecisions: [
      "WHY PDFKit over third-party library: PDFKit is Apple-native, no dependencies, produces tribunal-ready output",
      "WHY Swift Charts: system framework, no extra weight, adapts to Dynamic Type and accessibility",
    ],
    concepts: [
      "How does evidence linking work — what is a bbox and how does it position a highlight?",
      "What is a trend chart and what usage patterns should concern a tenant?",
    ],
  },
  {
    id: "stage-6",
    stage: "Stage 6",
    title: "HK Regulation Research",
    status: "upcoming",
    summary:
      "Adds the Regulations tab backend: fetches from EMSD, WSD, Lands Tribunal, and Consumer Council sources, summarises relevant sections with an LLM, and caches results for offline viewing.",
    keyDecisions: [
      "ADR-007: HK-only for MVP (curated, accurate) vs generic global coverage (unreliable)",
      "WHY LLM summarisation: government documents are dense; tenants need plain-English answers",
      "WHY 48-hour cache: avoid hammering public government servers + works offline on mobile",
    ],
    concepts: [
      "What is the Scheme of Control Agreement and how does it set electricity prices?",
      "What does the Landlord and Tenant Ordinance say about utility charges?",
      "How does LLM summarisation work and what are its limits?",
    ],
  },
];

// ---------------------------------------------------------------------------
// Stage status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: TutorialSection["status"] }) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;

  const config = {
    done: { label: "Done", color: C.flagLow, bg: C.flagLowBg },
    "in-progress": { label: "Building", color: C.flagMedium, bg: C.flagMediumBg },
    upcoming: { label: "Upcoming", color: C.textMuted, bg: C.surfaceElevated },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Expandable tutorial section card
// ---------------------------------------------------------------------------
function TutorialCard({ section }: { section: TutorialSection }) {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const [expanded, setExpanded] = useState(section.status === "in-progress");

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable
        style={styles.cardHeader}
        onPress={() => setExpanded((v) => !v)}
        testID={`tutorial-card-${section.id}`}
      >
        <View style={styles.cardHeaderLeft}>
          <Text style={[styles.cardStage, { color: C.primary }]}>{section.stage}</Text>
          <Text style={[styles.cardTitle, { color: C.text }]}>{section.title}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <StatusBadge status={section.status} />
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={C.textMuted}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.cardBody, { borderTopColor: C.border }]}>
          <Text style={[styles.bodySummary, { color: C.textSecondary }]}>
            {section.summary}
          </Text>

          <Text style={[styles.subheading, { color: C.text }]}>Key Decisions</Text>
          {section.keyDecisions.map((d, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: C.primary }]} />
              <Text style={[styles.bulletText, { color: C.textSecondary }]}>{d}</Text>
            </View>
          ))}

          <Text style={[styles.subheading, { color: C.text }]}>Concepts to Understand</Text>
          {section.concepts.map((c, i) => (
            <View key={i} style={styles.bulletRow}>
              <Feather name="help-circle" size={13} color={C.textMuted} style={{ marginTop: 1 }} />
              <Text style={[styles.bulletText, { color: C.textMuted }]}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Learn screen
// ---------------------------------------------------------------------------
export default function LearnScreen() {
  const colorScheme = useColorScheme();
  const C = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

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
        <Text style={[styles.headerTitle, { color: C.text }]}>Learn</Text>
        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>
          Architecture, decisions, and concepts — the project as a tutorial
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
        {/* Intro banner */}
        <View style={[styles.introBanner, { backgroundColor: C.primarySubtle, borderColor: C.primary + "40" }]}>
          <Ionicons name="book" size={18} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.introTitle, { color: C.primary }]}>
              This app is a tutorial
            </Text>
            <Text style={[styles.introText, { color: C.textSecondary }]}>
              Every file has header comments explaining its role. Every non-obvious decision has a WHY comment. Every real error encountered during development is logged. Read the code alongside this guide.
            </Text>
          </View>
        </View>

        {/* Tutorial section cards */}
        {TUTORIAL_SECTIONS.map((section) => (
          <TutorialCard key={section.id} section={section} />
        ))}

        {/* ADR quick-reference */}
        <View style={[styles.adrBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.adrTitle, { color: C.text }]}>
            Architecture Decision Records
          </Text>
          <Text style={[styles.adrSub, { color: C.textSecondary }]}>
            Every major architectural choice has a corresponding ADR in{" "}
            <Text style={{ fontFamily: "Inter_500Medium", color: C.primary }}>
              docs/decisions/
            </Text>
            . Read them to understand the trade-offs behind each choice.
          </Text>
          {[
            "ADR-001 · SwiftData vs Core Data",
            "ADR-002 · Python backend vs all-Node.js",
            "ADR-003 · FieldWithSource provenance wrapper",
            "ADR-004 · Deterministic billing math",
            "ADR-005 · Append-only correction log",
            "ADR-006 · Polling vs WebSockets for OCR status",
            "ADR-007 · HK-only regulations for MVP",
          ].map((adr, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: C.borderSubtle }]} />
              <Text style={[styles.bulletText, { color: C.textMuted }]}>{adr}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16, gap: 12 },
  introBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  introTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  introText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  card: {
    borderRadius: 14, borderWidth: 1, overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", padding: 14, gap: 8,
  },
  cardHeaderLeft: { flex: 1, gap: 3 },
  cardHeaderRight: { alignItems: "flex-end", gap: 6 },
  cardStage: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardBody: { borderTopWidth: 1, padding: 14, gap: 10 },
  bodySummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  subheading: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  bulletText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  adrBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  adrTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  adrSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
