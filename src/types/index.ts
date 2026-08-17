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
  email: string;
  phone?: string;
  role: string;
  nodeId: string;
  firmware: string;
}

export interface AppState {
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
}

