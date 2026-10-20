// Greeting helper - map time-of-day to asset (giống utils/greeting_helper.dart)
import goodMorning from '../../../assets/images/goodmorning-Photoroom.png';
import goodAfternoon from '../../../assets/images/goodafternoon-Photoroom.png';
import goodEvening from '../../../assets/images/goodevening-Photoroom.png';

export const getGreetingAsset = (now = new Date()) => {
  const h = now.getHours();
  if (h < 12) return goodMorning;
  if (h < 18) return goodAfternoon;
  return goodEvening;
};

export const getGreetingText = (now = new Date(), isEn = false) => {
  const h = now.getHours();
  if (h < 12) return isEn ? 'Good morning' : 'Chào buổi sáng';
  if (h < 18) return isEn ? 'Good afternoon' : 'Chào buổi chiều';
  return isEn ? 'Good evening' : 'Chào buổi tối';
};
