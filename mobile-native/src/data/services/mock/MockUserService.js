/**
 * Mock User Service
 */

import { IUserService } from '../../interfaces/IUserService';
import userMock from '../../../shared/mocks/user.json';
import preferencesMock from '../../../shared/mocks/user-preferences.json';
import allergiesMock from '../../../shared/mocks/allergies.json';
import familyMock from '../../../shared/mocks/family-members.json';
import subscriptionMock from '../../../shared/mocks/subscription.json';
import packagesMock from '../../../shared/mocks/packages.json';

const MOCK_DELAY = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let profile = { ...userMock };
let preferences = { ...preferencesMock.preferences };
let allergies = JSON.parse(JSON.stringify(allergiesMock.allergies));
let family = JSON.parse(JSON.stringify(familyMock));

export class MockUserService extends IUserService {
  async getProfile() {
    await sleep(MOCK_DELAY / 2);
    return { ...profile };
  }

  async updateProfile(updates) {
    await sleep(MOCK_DELAY);
    profile = { ...profile, ...updates };
    return { ...profile };
  }

  async uploadAvatar(localUri) {
    await sleep(MOCK_DELAY);
    profile = { ...profile, avatar: localUri };
    return { url: localUri };
  }

  async getPreferences() {
    await sleep(MOCK_DELAY / 2);
    return { ...preferences };
  }

  async updatePreferences(prefs) {
    await sleep(MOCK_DELAY);
    preferences = { ...preferences, ...prefs };
    return { ...preferences };
  }

  async getAllergies() {
    await sleep(MOCK_DELAY / 2);
    return [...allergies];
  }

  async updateAllergies(newAllergies) {
    await sleep(MOCK_DELAY);
    allergies = [...newAllergies];
    return [...allergies];
  }

  async getFamily() {
    await sleep(MOCK_DELAY / 2);
    return JSON.parse(JSON.stringify(family));
  }

  async addFamilyMember(data) {
    await sleep(MOCK_DELAY);
    const newMember = {
      id: `member-${Date.now()}`,
      name: data.name,
      role: 'member',
      avatar: null,
    };
    family.members.push(newMember);
    return newMember;
  }

  async removeFamilyMember(id) {
    await sleep(MOCK_DELAY);
    const idx = family.members.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Thành viên không tồn tại');
    family.members.splice(idx, 1);
  }

  async getCurrentPlan() {
    await sleep(MOCK_DELAY / 2);
    return { ...subscriptionMock.plan };
  }

  async getAvailablePackages() {
    await sleep(MOCK_DELAY / 2);
    return [...packagesMock.packages];
  }
}
