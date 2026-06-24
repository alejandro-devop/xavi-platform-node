import { gql } from 'graphql-tag';

export const sleepTypeDefs = gql`
  enum SleepQuality {
    poor
    fair
    good
    excellent
  }

  enum MoodOnWaking {
    tired
    groggy
    refreshed
    energized
  }

  type SleepLog {
    id: ID!
    userId: Int!
    sleepDate: DateTime!
    bedtime: DateTime!
    wakeTime: DateTime!
    durationMinutes: Int!
    durationHours: String!
    quality: SleepQuality
    moodOnWaking: MoodOnWaking
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type SleepLogCollection {
    sleepLogs: [SleepLog!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  type SleepQualityDistribution {
    poor: Int!
    fair: Int!
    good: Int!
    excellent: Int!
  }

  type SleepStatsPeriod {
    startDate: DateTime
    endDate: DateTime
  }

  type SleepStats {
    totalNights: Int!
    avgDurationMinutes: Int!
    avgDurationHours: String!
    minDurationMinutes: Int!
    minDurationHours: String!
    maxDurationMinutes: Int!
    maxDurationHours: String!
    qualityDistribution: SleepQualityDistribution!
    period: SleepStatsPeriod!
  }

  extend type Query {
    sleepLog(id: ID!): SleepLog
    sleepLogs(
      startDate: DateTime
      endDate: DateTime
      quality: SleepQuality
      page: Int
      limit: Int
    ): SleepLogCollection!
    sleepStats(startDate: DateTime, endDate: DateTime): SleepStats!
  }

  extend type Mutation {
    sleepLogAdd(input: SleepLogInput!): SleepLog!
    sleepLogEdit(input: SleepLogEditInput!): SleepLog!
    sleepLogRemove(id: ID!): Boolean!
  }

  input SleepLogInput {
    sleepDate: DateTime!
    bedtime: DateTime!
    wakeTime: DateTime!
    bedtimeStartTime: String
    quality: SleepQuality
    moodOnWaking: MoodOnWaking
    notes: String
  }

  input SleepLogEditInput {
    id: ID!
    sleepDate: DateTime
    bedtime: DateTime
    wakeTime: DateTime
    bedtimeStartTime: String
    quality: SleepQuality
    moodOnWaking: MoodOnWaking
    notes: String
  }
`;
