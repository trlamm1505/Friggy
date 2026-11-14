import React from 'react';
import Svg, { Rect, Line } from 'react-native-svg';
import { AppColors } from '../../theme/colors';

// Realistic dual-door fridge icon (mapping từ _FridgePainter trong custom_bottom_nav_bar.dart)
export const FriggyIcon = ({ size = 24, color = AppColors.forestAccent, isSelected = false }) => {
  const w = size;
  const h = size * 1.15;

  // Selected → solid color, unselected → outlined
  const fillColor = isSelected ? color : color;
  const doorStroke = isSelected ? color : 'transparent';

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Top freezer door */}
      <Rect
        x={1.5}
        y={0}
        width={w - 3}
        height={h * 0.38}
        rx={3}
        ry={3}
        fill={fillColor}
        stroke={doorStroke}
        strokeWidth={1}
      />
      {/* Bottom fridge door */}
      <Rect
        x={1.5}
        y={h * 0.42}
        width={w - 3}
        height={h - 3}
        rx={3}
        ry={3}
        fill={fillColor}
        stroke={doorStroke}
        strokeWidth={1}
      />
      {/* Top handle */}
      <Line
        x1={w - 4.5}
        y1={4}
        x2={w - 4.5}
        y2={h * 0.3}
        stroke={isSelected ? '#FFFFFF' : AppColors.forestAccent}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Bottom handle */}
      <Line
        x1={w - 4.5}
        y1={h * 0.48}
        x2={w - 4.5}
        y2={h * 0.74}
        stroke={isSelected ? '#FFFFFF' : AppColors.forestAccent}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* Feet */}
      <Line x1={4} y1={h - 2} x2={4} y2={h} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={w - 4} y1={h - 2} x2={w - 4} y2={h} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
};
