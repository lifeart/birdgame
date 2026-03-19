// Core module exports
export { AudioManager } from './audio.ts';
export * from './audio/sound-recipes.ts';
export * from './constants.ts';
export {
    ProgressionManager,
    type LevelReward,
    type UnlockedReward,
    type ProgressionStats,
    type XPAction,
    type XPGainCallback,
    type LevelUpCallback
} from './progression.ts';
export {
    DailyRewardsManager,
    type DailyReward,
    type ClaimedReward,
    type TodayRewardInfo,
    type RewardDisplayInfo,
    type StreakBonus,
    type DailyRewardsStats,
    type RewardClaimedCallback,
    type StreakBrokenCallback
} from './rewards.ts';
export {
    NetworkManager,
    type PlayerData,
    type WormData,
    type FlyData,
    type LeaderboardEntry,
    type WelcomeData,
    type PlayerMovedData,
    type ChatMessageData,
    type WormCollectedData,
    type FlyCollectedData,
    type LocationChangedData,
    type ReconnectingData,
    type ConnectionFailedData,
    type NetworkEventMap
} from './network.ts';
export { DemoNetworkManager } from './demo-network.ts';
export {
    distanceSquared,
    distance,
    clamp,
    lerp
} from './utils.ts';
