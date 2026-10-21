export type ScreenType = 'dashboard' | 'admin' | 'analytics' | 'alerts' | 'rag' | 'settings';

export interface TelemetryData {
  totalPowerKw: number;
  costToday: number;
  vsYesterday: number;
  voltage: number;
  currentAmps: number;
  powerFactor: number;
  frequency: number;
  cumulativeKwh: number;
  gridStatus: string;
  hardwareStatus?: string;
  wifiRssi: number;
  peakTariffActive: boolean;
  peakCountdown?: string;
  relay1State?: 'ON' | 'OFF';
  relay2State?: 'ON' | 'OFF';
  powerSource?: string;
}

export interface SinglePlugLoadPreset {
  id: string;
  name: string;
  category: string;
  emoji: string;
  icon: string;
  baselineWatts: number;
}

export interface SinglePlugData {
  id: string;
  nodeId: string;
  name: string;
  relayState: 'ON' | 'OFF';
  relay1State?: 'ON' | 'OFF';
  relay2State?: 'ON' | 'OFF';
  powerSource?: string;
  selectedLoadId: string;
  connectedLoadName: string;
  connectedLoadCategory: string;
  emoji: string;
  icon: string;
  watts: number;
  baselineWatts: number;
  isAnomaly: boolean;
  anomalyReason?: string;
  history: number[];
  presets: SinglePlugLoadPreset[];
}

export interface Appliance {
  id: string;
  name: string;
  category: string;
  emoji?: string;
  icon?: string;
  watts: number;
  baselineWatts: number;
  status: 'Active' | 'Idle' | 'Scheduled';
  isAnomaly: boolean;
  anomalyReason?: string;
  history: number[];
}

export interface AlertItem {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  actionable: boolean;
  actionText?: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
}

export interface UserProfile {
  name: string;
  full_name?: string;
  email: string;
  phone?: string;
  role: string;
  nodeId: string;
  firmware: string;
}

export interface PlugSchedule {
  id: string;
  name: string;
  enabled: boolean;
  onTime: string;  // "06:30" (24-hour format HH:MM)
  offTime: string; // "23:00" (24-hour format HH:MM)
  repeat: 'EVERYDAY' | 'WEEKDAYS' | 'WEEKENDS';
  category?: string;
}

export interface TimerState {
  active: boolean;
  targetState: 'ON' | 'OFF';
  totalSeconds: number;
  secondsRemaining: number;
  label: string;
  startedAt?: number;
}

export interface ApplianceUsageHistory {
  id: string;
  name: string;
  category: string;
  emoji: string;
  icon: string;
  todayKwh: number;
  yesterdayKwh: number;
  thisWeekKwh: number;
  thisMonthKwh: number;
  baselineWatts: number;
  efficiencyScore: string;
  sparkline: number[];
  estimatedCostMonth: number;
}

export interface PeakUsageData {
  peakWindow: string;
  averageKw: number;
  peakKw: number;
  isPeakNow?: boolean;
  peakTariffRate?: string;
  offPeakTariffRate?: string;
  recommendation: string;
}

export interface EnergyGoalData {
  targetKwh: number;
  usedKwh: number;
  remainingKwh: number;
  progressPct: number;
  daysLeftInMonth: number;
  projectedKwh: number;
  status: 'On Track' | 'Warning' | 'Exceeded';
}

export interface Achievement {
  id: string;
  badge: string;
  title: string;
  description: string;
  unlockedAt: string;
  isNew?: boolean;
}

export interface AppState {
  theme: 'light' | 'dark';
  isLoggedIn: boolean;
  currentScreen?: ScreenType;
  user: UserProfile;
  telemetry: TelemetryData;
  singlePlug: SinglePlugData;
  appliances: Appliance[];
  alerts: AlertItem[];
  ragKnowledgeBase: KnowledgeItem[];
  simulatedAnomalyActive: boolean;
  isCopilotModalOpen?: boolean;
  isSimulatorModalOpen?: boolean;
  selectedKnowledgeItem?: KnowledgeItem | null;
  schedules?: PlugSchedule[];
  timer?: TimerState;
  selectedApplianceHistoryId?: string;
  applianceHistories?: ApplianceUsageHistory[];
  peakUsage?: PeakUsageData;
  energyGoal?: EnergyGoalData;
  achievements?: Achievement[];
}


export interface ForgotPasswordResult {
  success: boolean;
  is_registered: boolean;
  message: string;
  email?: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  email?: string;
  name?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  user?: UserProfile;
}

