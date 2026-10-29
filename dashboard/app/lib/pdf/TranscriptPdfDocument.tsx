import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { TranscriptSegment } from "../../types/types";
import { formatTimestamp } from "../../utils/date";
import {
  SPEAKER_PALETTE,
  SpeakerStats,
} from "../../utils/transcript";
import { buildPieSlices } from "./piePaths";

type Props = {
  jobName: string;
  fileName: string;
  generatedAt: string;
  stats: SpeakerStats;
  segments: TranscriptSegment[];
  labels: {
    statistics: string;
    speakersDetected: string;
    totalWords: string;
    totalCharacters: string;
    wordsLabel: string;
    transcript: string;
  };
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 10,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: "#111827",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 8,
  },
  statLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  chartRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 18,
    alignItems: "flex-start",
  },
  legend: {
    flex: 1,
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    flex: 1,
  },
  legendMeta: {
    fontSize: 8,
    color: "#6b7280",
  },
  segment: {
    marginBottom: 10,
  },
  segmentMeta: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  speaker: {
    fontWeight: "bold",
    fontSize: 10,
  },
  timestamp: {
    fontSize: 9,
    color: "#6b7280",
  },
  segmentText: {
    fontSize: 10,
    lineHeight: 1.45,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default function TranscriptPdfDocument({
  jobName,
  fileName,
  generatedAt,
  stats,
  segments,
  labels,
}: Props) {
  const colors = SPEAKER_PALETTE.map((entry) => entry.hex);
  const slices = buildPieSlices(
    stats.perSpeaker.map((item) => item.percentage),
    colors
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{jobName}</Text>
          <Text style={styles.subtitle}>
            {fileName} · {generatedAt}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{labels.statistics}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{labels.speakersDetected}</Text>
            <Text style={styles.statValue}>{stats.speakerCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{labels.totalWords}</Text>
            <Text style={styles.statValue}>{stats.totalWords}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{labels.totalCharacters}</Text>
            <Text style={styles.statValue}>{stats.totalChars}</Text>
          </View>
        </View>

        <View style={styles.chartRow}>
          <Svg width={110} height={110} viewBox="0 0 100 100">
            {slices.map((slice, index) => (
              <Path key={index} d={slice.d} fill={slice.color} />
            ))}
            <Path
              d="M 50 50 m -22 0 a 22 22 0 1 0 44 0 a 22 22 0 1 0 -44 0"
              fill="#ffffff"
            />
          </Svg>
          <View style={styles.legend}>
            {stats.perSpeaker.map((item, index) => (
              <View key={`${item.speaker}-${index}`} style={styles.legendRow}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: colors[index % colors.length] },
                  ]}
                />
                <Text style={styles.legendText}>{item.speaker}</Text>
                <Text style={styles.legendMeta}>
                  {item.words} {labels.wordsLabel} · {item.percentage}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>{labels.transcript}</Text>
        {segments.map((segment, index) => (
          <View key={`${segment.start}-${index}`} style={styles.segment} wrap={false}>
            <View style={styles.segmentMeta}>
              <Text style={styles.speaker}>{segment.speaker}</Text>
              <Text style={styles.timestamp}>
                {formatTimestamp(segment.start)}
              </Text>
            </View>
            <Text style={styles.segmentText}>{segment.text}</Text>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{jobName}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
