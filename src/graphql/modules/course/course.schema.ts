import { gql } from 'graphql-tag';

export const courseTypeDefs = gql`
  enum CourseDifficulty {
    beginner
    intermediate
    advanced
  }

  enum CourseStatus {
    not_started
    in_progress
    completed
  }

  enum LessonContentType {
    video
    text
    quiz
    exercise
    assignment
  }

  type CourseLesson {
    id: ID!
    moduleId: ID!
    title: String!
    contentType: LessonContentType
    contentUrl: String
    durationMinutes: Int
    orderIndex: Int!
    completed: Boolean!
    completionDate: DateTime
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CourseModule {
    id: ID!
    courseId: ID!
    title: String!
    description: String
    orderIndex: Int!
    lessons: [CourseLesson!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Course {
    id: ID!
    userId: Int!
    title: String!
    description: String
    instructor: String
    durationHours: Int
    difficulty: CourseDifficulty
    tags: [String!]
    status: CourseStatus!
    totalModules: Int!
    totalLessons: Int!
    completedLessons: Int!
    progress: Int!
    modules: [CourseModule!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CourseCollection {
    courses: [Course!]!
    page: Int!
    limit: Int!
    total: Int!
  }

  type CourseProgressDetail {
    courseId: ID!
    totalModules: Int!
    totalLessons: Int!
    completedLessons: Int!
    progress: Int!
    startedDate: DateTime
    lastActivity: DateTime
  }

  type UserCourseLessonProgress {
    id: ID!
    userId: Int!
    lessonId: ID!
    completed: Boolean!
    completionDate: DateTime
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CourseLessonProgressResult {
    progress: UserCourseLessonProgress!
    courseStatus: CourseStatus!
  }

  extend type Query {
    course(id: ID!): Course
    courses(
      status: CourseStatus
      difficulty: CourseDifficulty
      page: Int
      limit: Int
    ): CourseCollection!
    courseProgress(courseId: ID!): CourseProgressDetail!
  }

  extend type Mutation {
    courseAdd(input: CourseInput!): Course!
    courseEdit(input: CourseEditInput!): Course!
    courseRemove(id: ID!): Boolean!
    courseModuleAdd(input: CourseModuleInput!): CourseModule!
    courseModuleEdit(input: CourseModuleEditInput!): CourseModule!
    courseModuleRemove(input: CourseModuleRemoveInput!): Boolean!
    courseLessonAdd(input: CourseLessonInput!): CourseLesson!
    courseLessonEdit(input: CourseLessonEditInput!): CourseLesson!
    courseLessonRemove(input: CourseLessonRemoveInput!): Boolean!
    courseLessonProgress(input: CourseLessonProgressInput!): CourseLessonProgressResult!
  }

  input CourseInput {
    title: String!
    description: String
    instructor: String
    durationHours: Int
    difficulty: CourseDifficulty
    tags: [String!]
  }

  input CourseEditInput {
    id: ID!
    title: String
    description: String
    instructor: String
    durationHours: Int
    difficulty: CourseDifficulty
    tags: [String!]
    status: CourseStatus
  }

  input CourseModuleInput {
    courseId: ID!
    title: String!
    description: String
    orderIndex: Int!
  }

  input CourseModuleEditInput {
    courseId: ID!
    moduleId: ID!
    title: String
    description: String
    orderIndex: Int
  }

  input CourseModuleRemoveInput {
    courseId: ID!
    moduleId: ID!
  }

  input CourseLessonInput {
    courseId: ID!
    moduleId: ID!
    title: String!
    contentType: LessonContentType
    contentUrl: String
    durationMinutes: Int
    orderIndex: Int!
  }

  input CourseLessonEditInput {
    courseId: ID!
    moduleId: ID!
    lessonId: ID!
    title: String
    contentType: LessonContentType
    contentUrl: String
    durationMinutes: Int
    orderIndex: Int
  }

  input CourseLessonRemoveInput {
    courseId: ID!
    moduleId: ID!
    lessonId: ID!
  }

  input CourseLessonProgressInput {
    courseId: ID!
    lessonId: ID!
    completed: Boolean!
    notes: String
  }
`;
