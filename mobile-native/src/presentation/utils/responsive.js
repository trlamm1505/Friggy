import { Dimensions, PixelRatio } from 'react-native';

// Design size giống Flutter ScreenUtil
const DESIGN_WIDTH = 412;
const DESIGN_HEIGHT = 915;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const widthScale = SCREEN_WIDTH / DESIGN_WIDTH;
const heightScale = SCREEN_HEIGHT / DESIGN_HEIGHT;
const fontScale = Math.min(widthScale, heightScale);

// Spacing (w/h) theo screen width
export const sw = (size) => size * widthScale;
export const sh = (size) => size * heightScale;

// Font size (sp) theo min(width, height) scale
export const sp = (size) => {
  const fontSize = size * fontScale;
  return Math.round(PixelRatio.roundToNearestPixel(fontSize));
};

export const screenWidth = SCREEN_WIDTH;
export const screenHeight = SCREEN_HEIGHT;

export const isSmallDevice = SCREEN_WIDTH < 360;
export const isLargeDevice = SCREEN_WIDTH > 480;
