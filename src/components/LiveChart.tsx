/**
 * src/components/LiveChart.tsx
 *
 * Warm Coffee-Shop Line Chart:
 * - G-force line: mocha (#7A5648 / #D2A782)
 * - Area fill: caramel with 25% opacity
 * - Speed line: sage green (#5B8C5A)
 * - Threshold line: terracotta (#B5523B) dashed
 * - Gridlines: theme border token
 * - Debug strip: "Peak (last 10 s): X.XX g | Threshold: Y.YY g"
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon, Line, Text as SvgText } from 'react-native-svg';

import { useThemeColors, spacing, fontSize as fontSizes, borderRadius } from '../theme';
import type { ChartDataPoint } from '../types';

interface LiveChartProps {
  data: ChartDataPoint[];
  thresholdG: number;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 165;
const PADDING = { top: 14, right: 10, bottom: 25, left: 36 };

const INNER_W = CHART_WIDTH - PADDING.left - PADDING.right;
const INNER_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

export function LiveChart({ data, thresholdG }: LiveChartProps) {
  const colors = useThemeColors();

  const { gPoints, areaPoints, speedPoints, maxG, maxSpeed, thresholdY, peak10s } = useMemo(() => {
    let highestG = 0;
    for (const d of data) {
      if (d.gForce > highestG) highestG = d.gForce;
    }

    if (data.length < 2) {
      const baseMaxG = Math.max(2.0, Math.ceil((thresholdG + 0.2) * 10) / 10);
      const threshY = PADDING.top + INNER_H - (thresholdG / baseMaxG) * INNER_H;
      return {
        gPoints: '',
        areaPoints: '',
        speedPoints: '',
        maxG: baseMaxG,
        maxSpeed: 60,
        thresholdY: threshY,
        peak10s: highestG,
      };
    }

    const minTime = data[0].time;
    const maxTime = data[data.length - 1].time;
    const timeRange = Math.max(maxTime - minTime, 1);

    let mg = Math.max(2.0, thresholdG * 1.25);
    let ms = 60;
    for (const d of data) {
      if (d.gForce > mg) mg = Math.ceil(d.gForce * 10) / 10;
      if (d.speedKmh > ms) ms = Math.ceil(d.speedKmh / 10) * 10;
    }

    // 3-sample display smoothing for the visual line
    const smoothedGValues: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const wStart = Math.max(0, i - 2);
      const slice = data.slice(wStart, i + 1);
      const avg = slice.reduce((acc, curr) => acc + curr.gForce, 0) / slice.length;
      smoothedGValues.push(avg);
    }

    const gPts: string[] = [];
    const sPts: string[] = [];

    let firstX = PADDING.left;
    let lastX = PADDING.left + INNER_W;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const gVal = smoothedGValues[i];
      const x = PADDING.left + ((d.time - minTime) / timeRange) * INNER_W;

      if (i === 0) firstX = x;
      if (i === data.length - 1) lastX = x;

      const yG = PADDING.top + INNER_H - (Math.min(gVal, mg) / mg) * INNER_H;
      gPts.push(`${x},${yG}`);

      const yS = PADDING.top + INNER_H - (Math.min(d.speedKmh, ms) / ms) * INNER_H;
      sPts.push(`${x},${yS}`);
    }

    // Area polygon points: starts at baseline, follows gPts, ends at baseline
    const baselineY = PADDING.top + INNER_H;
    const areaPts = `${firstX},${baselineY} ${gPts.join(' ')} ${lastX},${baselineY}`;

    const threshY = PADDING.top + INNER_H - (Math.min(thresholdG, mg) / mg) * INNER_H;

    return {
      gPoints: gPts.join(' '),
      areaPoints: areaPts,
      speedPoints: sPts.join(' '),
      maxG: mg,
      maxSpeed: ms,
      thresholdY: threshY,
      peak10s: highestG,
    };
  }, [data, thresholdG]);

  return (
    <View style={styles.container}>
      {/* Legend with coffee-shop tokens */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.graphGLine }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Impact G</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.graphSpeedLine }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Speed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.graphThresholdLine }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            Threshold ({thresholdG.toFixed(2)}g)
          </Text>
        </View>
      </View>

      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={styles.svg}>
        {/* Gridlines in border color */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PADDING.top + INNER_H * (1 - frac);
          return (
            <Line
              key={`grid-${frac}`}
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + INNER_W}
              y2={y}
              stroke={colors.graphGrid}
              strokeWidth={0.7}
              strokeDasharray="2,3"
            />
          );
        })}

        {/* Y-axis labels (Impact G on left) */}
        <SvgText x={2} y={PADDING.top + 4} fill={colors.graphGLine} fontSize={9} fontWeight="bold">
          {maxG.toFixed(1)}g
        </SvgText>
        <SvgText x={2} y={PADDING.top + INNER_H} fill={colors.graphGLine} fontSize={9} fontWeight="bold">
          0.0g
        </SvgText>

        {/* Y-axis labels (Speed on right) */}
        <SvgText x={PADDING.left + INNER_W + 2} y={PADDING.top + 4} fill={colors.graphSpeedLine} fontSize={9} fontWeight="bold">
          {maxSpeed}
        </SvgText>

        {/* X-axis label */}
        <SvgText
          x={PADDING.left + INNER_W / 2}
          y={CHART_HEIGHT - 3}
          fill={colors.textMuted}
          fontSize={9}
          textAnchor="middle"
        >
          Time (10 s)
        </SvgText>

        {/* Terracotta Dashed Threshold Line */}
        <Line
          x1={PADDING.left}
          y1={thresholdY}
          x2={PADDING.left + INNER_W}
          y2={thresholdY}
          stroke={colors.graphThresholdLine}
          strokeWidth={1.5}
          strokeDasharray="5,3"
        />

        {/* Caramel Area Fill (25% opacity) */}
        {areaPoints.length > 0 && (
          <Polygon
            points={areaPoints}
            fill={colors.graphGFill}
          />
        )}

        {/* Sage Green Speed line (dashed) */}
        {speedPoints.length > 0 && (
          <Polyline
            points={speedPoints}
            fill="none"
            stroke={colors.graphSpeedLine}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeDasharray="4,2"
          />
        )}

        {/* Mocha G-Force Line (solid) */}
        {gPoints.length > 0 && (
          <Polyline
            points={gPoints}
            fill="none"
            stroke={colors.graphGLine}
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
        )}
      </Svg>

      {/* Debug Strip with warm coffee tokens */}
      <View style={[styles.debugStrip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Text style={[styles.debugText, { color: colors.text }]}>
          Peak (last 10 s):{' '}
          <Text style={{ fontWeight: '800', color: peak10s >= thresholdG ? colors.danger : colors.primary }}>
            {peak10s.toFixed(2)} g
          </Text>
          {'  '}•{'  '}Threshold:{' '}
          <Text style={{ fontWeight: '800', color: colors.graphThresholdLine }}>
            {thresholdG.toFixed(2)} g
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  svg: {
    alignSelf: 'center',
  },
  debugStrip: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill, // pill-shaped debug strip
    borderWidth: 1,
    alignItems: 'center',
    width: '100%',
  },
  debugText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
});
