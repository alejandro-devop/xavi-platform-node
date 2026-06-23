# Graph Report - xavi-platform-node  (2026-06-23)

## Corpus Check
- 294 files · ~125,561 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1902 nodes · 4350 edges · 92 communities (87 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1ab7a52`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 87|Community 87]]

## God Nodes (most connected - your core abstractions)
1. `getDbPool()` - 275 edges
2. `NotFoundError` - 51 edges
3. `ForbiddenError` - 47 edges
4. `BadRequestError` - 41 edges
5. `scripts` - 26 edges
6. `resetAllMocks()` - 25 edges
7. `mockDbPool` - 22 edges
8. `withValidatedResolver()` - 20 edges
9. `compilerOptions` - 19 edges
10. `requireAuth()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `listCategories()` --calls--> `getDbPool()`  [EXTRACTED]
  src/services/activity-category.service.ts → src/shared/database/pool.ts
- `sumSpentTimeMinutes()` --calls--> `getDbPool()`  [EXTRACTED]
  src/services/activity-follow-up.service.ts → src/shared/database/pool.ts
- `syncFolders()` --calls--> `getDbPool()`  [EXTRACTED]
  src/services/activity-todo-folders.service.ts → src/shared/database/pool.ts
- `listActivities()` --calls--> `getDbPool()`  [EXTRACTED]
  src/services/activity.service.ts → src/shared/database/pool.ts
- `listCourses()` --calls--> `getDbPool()`  [EXTRACTED]
  src/services/course.service.ts → src/shared/database/pool.ts

## Import Cycles
- None detected.

## Communities (92 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (54): createLearningResource(), deleteLearningResource(), deleteProgressSession(), getLearningResourceById(), getLearningResources(), getProgressSessions(), logProgress(), updateLearningResource() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (55): assertCourseOwnership(), calcProgressPercent(), CourseListRow, CourseRow, createCourse(), createLesson(), createModule(), deleteCourse() (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (47): generateUuidV7(), dayOfWeek, todoDailyTemplateAddInputSchema, todoDailyTemplateEditInputSchema, todoDailyTemplateIdArgSchema, todoDailyTemplatesDayArgSchema, todoPriority, folderIdString (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (49): createRoutine(), createRoutineStep(), deleteRoutine(), deleteRoutineStep(), getRoutineById(), getRoutines(), toggleRoutineActive(), updateRoutine() (+41 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (29): BaseStrategy, CacheParams, cacheStrategies, EmailParams, emailStrategies, MemoryCacheStrategy, NotificationParams, notificationStrategies (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (45): dateString, followUpIdString, habitAddInputSchema, habitCategoryAddInputSchema, habitCategoryEditInputSchema, habitCategoryIdArgSchema, habitCompleteArgSchema, habitEditFields (+37 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (38): confirmAccountDeletion(), forgotPassword(), generateAndSendAccountDeletionOTP(), getProfile(), login(), logout(), refreshAccessToken(), register() (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (23): activityTypeDefs, budgetTypeDefs, healthTypeDefs, scalarsTypeDefs, courseTypeDefs, expenseCategoryTypeDefs, expenseTypeDefs, frequencyTypeDefs (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (38): deleteProject(), deleteSessionLog(), deleteWeekScheduleSlot(), listProjects(), listQuarters(), listSessionLogs(), MemberRow, ObjectiveRow (+30 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (37): assertTodoOwnership(), completeTodo(), createSubtask(), createTodo(), deleteSubtask(), deleteTodo(), FolderIdKey, getNextOrderIndexInFolder() (+29 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (33): addItemToShoppingList(), createCatalogItem(), createShoppingList(), deleteCatalogItem(), deleteShoppingList(), deleteShoppingListItem(), getCatalogItemById(), getCatalogItems() (+25 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (31): activityFollowUpService, assertNoOpenFollowUp(), createFollowUp(), deleteFollowUp(), FollowUpRow, formatDateForApi(), getFollowUpById(), getFollowUpRowOrThrow() (+23 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (31): createAccount(), createCategory(), createTransaction(), deleteAccount(), deleteCategory(), deleteTransaction(), getAccountById(), getAccounts() (+23 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (8): DefaultMonitoringAdapter, ErrorHandler, ErrorMetadata, LogLevel, MonitoringAdapter, DatadogMonitoringAdapter, SentryMonitoringAdapter, mockLogger

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (11): NotFoundError, mockDbPool, mockGetDbPool, mockGetDbPool, mockGetDbPool, mockGetDbPool, mockGetDbPool, mockGetDbPool (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (27): createCourse(), createLesson(), createModule(), deleteCourse(), deleteLesson(), deleteModule(), getCourseById(), getCourseProgress() (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (26): activitiesListArgsSchema, activityAddInputSchema, activityCategoryAddInputSchema, activityCategoryEditInputSchema, activityCategoryIdArgSchema, activityDayFollowUpsArgsSchema, activityEditInputSchema, activityFollowUpAddInputSchema (+18 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (23): walletExpenseCategories, expenseCategoryResolvers, CategoryId, categoryIdSchema, CategoryTypeFilter, categoryTypeFilterSchema, createExpenseCategoryInputSchema(), createExpenseCategoryUpdateSchema() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (13): AppError, BadRequestError, ConflictError, ForbiddenError, mockGetDbPool, mockGetDbPool, swBondService, mockGetDbPool (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (22): LIST_CATEGORIES, swAddListItemSchema, swCompleteListItemSchema, swCreateListSchema, swDeleteListSchema, swDissolveBondSchema, swItemLogSchema, swListInputFields (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (26): calculateCurrentStreak(), getHabitMyDay(), HabitLogRow, HabitRow, listHabits(), removeHabitFollowUp(), syncHabitStreakFromLogs(), AddHabitLogInput (+18 more)

### Community 21 - "Community 21"
Cohesion: 0.15
Nodes (26): DayOfWeek, ActivityRow, addActivitiesBatch(), addActivity(), checkConflict(), DAY_ORDER, formatTime(), getActivityEntry() (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (22): commonSchemas, createExistsValidator(), validateAtLeastOne(), validateConditionalField(), validateDateRange(), validateDateWithinRange(), validateExactlyOne(), validateFieldsMatch() (+14 more)

### Community 23 - "Community 23"
Cohesion: 0.15
Nodes (18): mockErrorHandler, mockErrorHandler, noteResolvers, noteAddInputSchema, noteEditInputSchema, noteIdArgSchema, notesListArgsSchema, tagIdString (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (24): dayOfWeekEnum, objectiveAddInputSchema, objectiveEditInputSchema, objectiveIdArgSchema, projectAddInputSchema, projectEditInputSchema, projectIdArgSchema, projectSessionLogsArgsSchema (+16 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (25): assertSleepLogOwnership(), calculateDurationMinutes(), createSleepLog(), deleteSleepLog(), formatDurationHours(), getOwnedSleepLogOrThrow(), getSleepLogById(), getSleepLogRowOrThrow() (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (23): addWeeklyRoutineActivity(), createWeeklyRoutine(), deleteWeeklyRoutine(), deleteWeeklyRoutineActivity(), getActiveWeeklyRoutine(), getWeeklyRoutine(), listWeeklyRoutines(), setWeeklyRoutineActive() (+15 more)

### Community 27 - "Community 27"
Cohesion: 0.08
Nodes (26): scripts, build, dev, docker:build, docker:down, docker:down:clean, docker:health, docker:logs (+18 more)

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (25): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib (+17 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (24): items, itemsRelations, shoppingListItems, shoppingListItemsRelations, shoppingLists, shoppingListsRelations, swBondStatusEnum, swCinnamonBonds (+16 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (25): devDependencies, drizzle-kit, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, prettier, supertest (+17 more)

### Community 31 - "Community 31"
Cohesion: 0.18
Nodes (16): initializeServices(), shutdownServices(), closeDrizzle(), DrizzleDb, getDrizzlePool(), initializeDrizzle(), closeDbPool(), initializeDbPool() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): dependencies, @apollo/server, @as-integrations/express4, bcryptjs, compression, cors, dotenv, drizzle-orm (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (18): courseAddInputSchema, courseDifficulty, courseEditInputSchema, courseIdArgSchema, courseIdString, courseLessonAddInputSchema, courseLessonEditInputSchema, courseLessonProgressInputSchema (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.19
Nodes (20): ActivityRow, assertActivityOwnership(), completeActivity(), createActivity(), deleteActivity(), getActivityById(), getActivityRowOrThrow(), getOwnedActivityOrThrow() (+12 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (13): fetchListItemsForList(), fetchListItemsForLists(), mapItemRow(), mapListItemRows(), PaginatedShoppingItems, PaginatedShoppingLists, parseMoney(), ShoppingItem (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.14
Nodes (18): mapItemRow(), mapListRow(), requireBondOwnershipForItem(), requireBondOwnershipForList(), swListService, AddListItemInput, BondStatus, CinnamonBond (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (19): budgetResolvers, ApplyBudgetToExpenses, applyBudgetToExpensesSchema, BudgetClosuresFilter, budgetClosuresFilterSchema, BudgetFilter, budgetFilterSchema, BudgetId (+11 more)

### Community 38 - "Community 38"
Cohesion: 0.18
Nodes (18): completeTodo(), createSubtask(), createTodo(), deleteSubtask(), deleteTodo(), getTodoById(), getTodos(), updateSubtask() (+10 more)

### Community 39 - "Community 39"
Cohesion: 0.18
Nodes (21): assertHabitOwnership(), completeHabit(), createHabit(), deleteHabit(), formatDate(), getHabitById(), getHabitRowOrThrow(), getHabitStats() (+13 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (17): createHabit(), deleteHabit(), getHabitById(), getHabitLogs(), getHabits(), getHabitStats(), logHabitCompletion(), updateHabit() (+9 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (14): getDb(), walletWallets, mockExpenseCategoryService, expenseCategoryService, CreateExpenseCategoryInput, ExpenseCategory, UpdateExpenseCategoryInput, CreateWalletInput (+6 more)

### Community 42 - "Community 42"
Cohesion: 0.16
Nodes (10): EmailService, AccountDeletionEmailParams, generateAccountDeletionEmailHTML(), generateAccountDeletionEmailText(), generatePasswordResetEmailHTML(), generatePasswordResetEmailText(), PasswordResetEmailParams, generateVerificationEmailHTML() (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.18
Nodes (18): assertTagsOwnedByUser(), createTag(), deleteTag(), findTagByName(), getOwnedTagOrThrow(), getTagById(), getTagRowOrThrow(), listTags() (+10 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (17): createNote(), deleteNote(), getNoteById(), getNoteRowOrThrow(), getOwnedNoteOrThrow(), listNotes(), listTagsForNote(), loadTagsForNoteIds() (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (14): completeActivity(), createActivity(), deleteActivity(), getActivities(), getActivityById(), updateActivity(), AsyncFunction, asyncHandler() (+6 more)

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (12): walletBudgetClosures, walletFrequencies, walletScheduledExpenses, budgetClosureService, ApplyBudgetToExpensesInput, Budget, BudgetClosure, BulkCloseBudgetPeriodsInput (+4 more)

### Community 47 - "Community 47"
Cohesion: 0.21
Nodes (12): createMockCategory(), createMockExpense(), createMockUser(), createMockWallet(), mockDb, resetAllMocks(), toSnakeCase(), mockGetDb (+4 more)

### Community 48 - "Community 48"
Cohesion: 0.14
Nodes (13): activityResolvers, healthResolvers, courseResolvers, frequencyResolvers, resolvers, habitResolvers, periodResolvers, quarterResolvers (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.18
Nodes (9): BUILTIN_ALLOWED_ORIGINS, getAllowedOrigins(), getCorsOptions(), ValidationError, errorHandler(), requestLogger(), validate(), router (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (14): router, router, router, router, router, router, router, router (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (15): BulkDeleteScheduledExpenses, bulkDeleteScheduledExpensesSchema, BulkUpdateScheduledExpenses, bulkUpdateScheduledExpensesSchema, PayScheduledExpense, payScheduledExpenseSchema, repeatTypeEnum, ScheduledExpenseFilter (+7 more)

### Community 52 - "Community 52"
Cohesion: 0.21
Nodes (14): shoppingCatalogItemAddInputSchema, shoppingCatalogItemIdArgSchema, shoppingCatalogItemUpdateInputSchema, shoppingListAddInputSchema, shoppingListIdArgSchema, shoppingListItemAddInputSchema, shoppingListItemCreateWithCatalogInputSchema, shoppingListItemIdsBatchSchema (+6 more)

### Community 53 - "Community 53"
Cohesion: 0.21
Nodes (15): CategoryRow, createCategory(), deleteCategory(), ensureDefaultCategoryId(), getCategoryById(), getCategoryRowOrThrow(), getOwnedCategoryOrThrow(), habitCategoryService (+7 more)

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (12): addHabitLog(), applyStreakAfterFollowUp(), getLifelinesUsedThisWeek(), addDaysToDateString(), applyFailedStreak(), applyLifelineToEndDate(), FollowUpStreakFields, getEffectiveGoal() (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.23
Nodes (13): createSleepLog(), deleteSleepLog(), getSleepLogById(), getSleepLogs(), getSleepStats(), updateSleepLog(), sleepService, createSleepLogSchema (+5 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (13): learningResolvers, learningPriority, learningProgressAddInputSchema, learningProgressEditInputSchema, learningProgressIdString, learningProgressRemoveInputSchema, learningResourceAddInputSchema, learningResourceEditInputSchema (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.19
Nodes (13): dayOfWeek, timeSchema, uuidSchema, weeklyRoutineActivityAddInputSchema, weeklyRoutineActivityBatchAddInputSchema, weeklyRoutineActivityEditInputSchema, weeklyRoutineActivityIdArgSchema, weeklyRoutineAddInputSchema (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.23
Nodes (14): activityCategoryService, CategoryRow, createCategory(), deleteCategory(), ensureDefaultCategoryId(), getCategoryById(), getCategoryRowOrThrow(), getOwnedCategoryOrThrow() (+6 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (10): swEmailService, swNotificationService, mockGetDbPool, NOW, CreateNotificationInput, EntityType, NotificationType, SWNotification (+2 more)

### Community 60 - "Community 60"
Cohesion: 0.25
Nodes (14): createFolder(), deleteFolder(), FolderRow, getFolderById(), getFolderRowOrThrow(), getOwnedFolderOrThrow(), listFolders(), mapFolder() (+6 more)

### Community 61 - "Community 61"
Cohesion: 0.19
Nodes (12): expenseResolvers, mockExpenseService, ExpenseFilter, expenseFilterSchema, ExpenseId, expenseIdSchema, ExpenseInput, expenseInputSchema (+4 more)

### Community 62 - "Community 62"
Cohesion: 0.24
Nodes (13): createMeasure(), deleteMeasure(), getMeasureById(), getMeasureRowOrThrow(), getOwnedMeasureOrThrow(), habitMeasureService, listMeasures(), mapMeasure() (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.22
Nodes (11): dayOfWeek, routineAddInputSchema, routineEditInputSchema, routineIdArgSchema, routineIdString, routinesListArgsSchema, routineStepAddInputSchema, routineStepEditInputSchema (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.23
Nodes (9): authRequests, buildGqlJsonBody(), ensureDir(), folderYaml(), gql(), normalizeGqlQuery(), ROOT, write() (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.26
Nodes (9): getGraphQLContext(), GraphQLContext, mockRedisClient, AuthenticatedUser, authMiddleware(), ownerMiddleware(), Request, getRedisClient() (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.24
Nodes (9): moodOnWaking, sleepLogAddInputSchema, sleepLogEditInputSchema, sleepLogIdArgSchema, sleepLogIdString, sleepLogsListArgsSchema, sleepQuality, sleepStatsArgsSchema (+1 more)

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (12): addProjectToQuarter(), createProject(), createSessionLog(), createWeekScheduleSlot(), getWeekStartDate(), mapProject(), mapQuarterProject(), mapSessionLog() (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (9): scheduledExpenseService, BulkDeleteScheduledExpensesInput, BulkUpdateScheduledExpensesInput, CreateScheduledExpenseInput, GetScheduledExpensesFilter, PayScheduledExpenseInput, ScheduledExpense, UpdateScheduledExpenseInput (+1 more)

### Community 69 - "Community 69"
Cohesion: 0.24
Nodes (12): buildSchedule(), createRoutine(), deleteRoutine(), getActiveRoutine(), getOwnedRoutineOrThrow(), getRoutineById(), getRoutineRowOrThrow(), listActivitiesForRoutine() (+4 more)

### Community 70 - "Community 70"
Cohesion: 0.27
Nodes (11): activateQuarter(), assertQuarterOwnership(), completeQuarter(), createQuarter(), getActiveQuarter(), getQuarterById(), listQuarterProjects(), listWeekScheduleSlots() (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.20
Nodes (9): author, description, engines, node, keywords, license, main, name (+1 more)

### Community 72 - "Community 72"
Cohesion: 0.31
Nodes (8): activityTodoFoldersService, getFolderIdsForActivity(), getFoldersForActivity(), listPendingTodosForActivity(), syncFolders(), mockGetDbPool, todoFolderService, todoService

### Community 73 - "Community 73"
Cohesion: 0.24
Nodes (10): addObjective(), assertProjectAccess(), getProjectById(), listMembersForProject(), listObjectivesForProject(), listSessionLogsByProject(), mapObjective(), removeObjective() (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.32
Nodes (6): documentation, EndpointDoc, getDocumentation(), getDocumentationJson(), ModuleDoc, router

### Community 75 - "Community 75"
Cohesion: 0.39
Nodes (6): walletBudgets, walletExpenses, CreateExpenseInput, Expense, GetExpensesFilter, UpdateExpenseInput

### Community 76 - "Community 76"
Cohesion: 0.25
Nodes (4): mockGetActivityById, mockGetDbPool, activityService, mockGetDbPool

### Community 78 - "Community 78"
Cohesion: 0.60
Nodes (4): getPoolConfig(), MigrationRecord, parseMigrationFile(), runMigrations()

### Community 79 - "Community 79"
Cohesion: 0.60
Nodes (4): getPoolConfig(), MigrationRecord, parseMigrationFile(), rollback()

### Community 80 - "Community 80"
Cohesion: 0.67
Nodes (3): getPoolConfig(), MigrationRecord, status()

### Community 81 - "Community 81"
Cohesion: 0.50
Nodes (4): getUserInfo(), safeDispatchBondSideEffects(), safeDispatchItemSideEffects(), safeDispatchLogSideEffects()

## Knowledge Gaps
- **376 isolated node(s):** `name`, `version`, `description`, `main`, `node` (+371 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDbPool()` connect `Community 12` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 14`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 25`, `Community 34`, `Community 35`, `Community 36`, `Community 39`, `Community 43`, `Community 44`, `Community 53`, `Community 54`, `Community 58`, `Community 59`, `Community 60`, `Community 62`, `Community 65`, `Community 67`, `Community 69`, `Community 70`, `Community 72`, `Community 73`, `Community 76`, `Community 81`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `NotFoundError` connect `Community 14` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 18`, `Community 20`, `Community 21`, `Community 23`, `Community 25`, `Community 34`, `Community 35`, `Community 36`, `Community 41`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 49`, `Community 53`, `Community 58`, `Community 59`, `Community 60`, `Community 62`, `Community 68`, `Community 76`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `ForbiddenError` connect `Community 18` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 14`, `Community 20`, `Community 21`, `Community 25`, `Community 34`, `Community 35`, `Community 36`, `Community 41`, `Community 43`, `Community 44`, `Community 49`, `Community 53`, `Community 58`, `Community 59`, `Community 60`, `Community 62`, `Community 68`, `Community 76`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06779661016949153 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07743496672716274 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05952380952380952 - nodes in this community are weakly interconnected._