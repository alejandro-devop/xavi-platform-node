#!/usr/bin/env node
/**
 * Generates Bruno 3.x OpenCollection YAML at:
 * /Users/jako/Developer/xavi-platform/bruno/xavi-api
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(
  process.env.BRUNO_OUT_DIR || '/Users/jako/Developer/xavi-platform/bruno/xavi-api'
);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, 'utf8');
}

function folderYaml(name, seq = 1) {
  return `info:
  name: ${name}
  type: folder
  seq: ${seq}
`;
}

function httpJson(name, seq, method, urlPath, body, opts = {}) {
  const { auth = true, scripts, docs } = opts;
  const headers = [
    '    - name: Content-Type',
    '      value: application/json',
  ];
  if (auth) {
    headers.push('    - name: Authorization', '      value: "Bearer {{token}}"');
  }
  let runtime = '';
  if (scripts) {
    runtime = `runtime:\n  scripts:\n${scripts.map((s) => `    - type: ${s.type}\n      code: |-\n${s.code.split('\n').map((l) => `        ${l}`).join('\n')}`).join('\n')}\n\n`;
  }
  const docsBlock = docs ? `\ndocs: |-\n  ${docs.split('\n').join('\n  ')}\n` : '';
  const bodyBlock = body
    ? `  body:
    type: json
    data: |-
${body.split('\n').map((l) => `      ${l}`).join('\n')}
`
    : '';
  return `info:
  name: ${name}
  type: http
  seq: ${seq}

http:
  method: ${method}
  url: "{{baseUrl}}${urlPath}"
  headers:
${headers.join('\n')}
${bodyBlock}
${runtime}settings:
  encodeUrl: true
${docsBlock}`;
}

/**
 * OpenCollection YAML: http + body.type graphql is NOT parsed by Bruno (empty POST).
 * Use body.type json with Apollo payload { query, variables } — works with the API.
 * @see https://github.com/usebruno/bruno/blob/main/packages/bruno-filestore/src/formats/yml/common/body.ts
 */
function normalizeGqlQuery(query) {
  return query
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

function buildGqlJsonBody(query, variablesJson = null) {
  const payload = { query: normalizeGqlQuery(query) };
  if (variablesJson) {
    payload.variables = JSON.parse(variablesJson);
  }
  return JSON.stringify(payload, null, 2);
}

function gql(name, seq, query, variables = null) {
  const jsonBody = buildGqlJsonBody(query, variables);
  return `info:
  name: ${name}
  type: http
  seq: ${seq}

http:
  method: POST
  url: "{{baseUrl}}/graphql"
  headers:
    - name: Content-Type
      value: application/json
    - name: Authorization
      value: "Bearer {{token}}"
  body:
    type: json
    data: |-
${jsonBody.split('\n').map((l) => `      ${l}`).join('\n')}

settings:
  encodeUrl: true
`;
}

const saveTokensScript = `const body = res.getBody();
if (!body) {
  console.warn("[save-tokens] Respuesta vacía");
  return;
}
if (body.status !== true || !body.data?.accessToken) {
  console.warn("[save-tokens] No hay accessToken", JSON.stringify(body));
  return;
}
bru.setEnvVar("token", body.data.accessToken);
console.log("[save-tokens] token guardado");
if (body.data.refreshToken) {
  bru.setEnvVar("refreshToken", body.data.refreshToken);
  console.log("[save-tokens] refreshToken guardado");
}`;

// --- Root ---
write(
  'opencollection.yml',
  `info:
  name: Xavi API
  type: collection
  description: Xavi Platform API — Auth REST + GraphQL (Bruno 3.3 OpenCollection YAML). Import this folder in Bruno.

vars:
  - name: baseUrl
    value: http://localhost:8080
  - name: email
    value: user@example.com
  - name: password
    value: ""
  - name: token
    value: ""
  - name: refreshToken
    value: ""
`
);

write(
  'README.md',
  `# Xavi API — Colección Bruno 3.3

**Ruta:** \`bruno/xavi-api\` (monorepo \`xavi-platform\`)

## Importar

1. Bruno 3.3+ → **Import Collection**
2. Carpeta: \`/Users/jako/Developer/xavi-platform/bruno/xavi-api\`
3. Formato: **OpenCollection YAML** (no OpenAPI)

## Ambientes

| Ambiente | Archivo |
|----------|---------|
| development | \`environments/development.yml\` |
| production | \`environments/production.yml\` |

Variables: \`baseUrl\`, \`email\`, \`password\`, \`token\`, \`refreshToken\`

## Flujo rápido

1. Selecciona ambiente **development**
2. Ajusta \`email\` y \`password\`
3. Ejecuta **Auth → Login** (guarda \`token\` y \`refreshToken\` automáticamente)
4. Usa carpetas **GraphQL → …**

## Regenerar colección

Desde \`xavi-platform-node\`:

\`\`\`bash
node scripts/generate-bruno-collection.mjs
\`\`\`

GraphQL en YAML usa \`body.type: json\` (payload Apollo). \`body.type: graphql\` en requests \`http\` deja el POST vacío en Bruno 3.3.

API: \`xavi-platform-node\` (\`npm run dev\` → puerto 8080 por defecto).
`
);

const envVars = (name, baseUrl) => `name: ${name}
variables:
  - name: baseUrl
    value: ${baseUrl}
  - name: email
    value: user@example.com
  - name: password
    value: ""
    secret: true
  - name: token
    value: ""
  - name: refreshToken
    value: ""
    secret: true
`;

write('environments/development.yml', envVars('development', 'http://localhost:8080'));
write(
  'environments/production.yml',
  envVars('production', 'https://xavi-api-2772744525.us-central1.run.app')
);

// --- Auth ---
write('auth/folder.yml', folderYaml('Auth', 1));

const authRequests = [
  [
    'Register',
    1,
    'POST',
    '/api/auth/register',
    `{
        "email": "{{email}}",
        "password": "{{password}}",
        "name": "Test User"
      }`,
    { auth: false },
  ],
  [
    'Login',
    2,
    'POST',
    '/api/auth/login',
    `{
        "email": "{{email}}",
        "password": "{{password}}"
      }`,
    {
      auth: false,
      scripts: [{ type: 'after-response', code: saveTokensScript }],
      docs: 'Guarda token y refreshToken en el ambiente activo.',
    },
  ],
  [
    'Refresh Token',
    3,
    'POST',
    '/api/auth/refresh',
    `{
        "refreshToken": "{{refreshToken}}"
      }`,
    {
      auth: false,
      scripts: [{ type: 'after-response', code: saveTokensScript }],
    },
  ],
  [
    'Logout',
    4,
    'POST',
    '/api/auth/logout',
    `{
        "refreshToken": "{{refreshToken}}"
      }`,
    { auth: false },
  ],
  [
    'Profile',
    5,
    'GET',
    '/api/auth/profile',
    null,
    {},
  ],
  [
    'Verify Email',
    6,
    'POST',
    '/api/auth/verify-email',
    `{
        "email": "{{email}}",
        "code": "123456"
      }`,
    { auth: false },
  ],
  [
    'Forgot Password',
    7,
    'POST',
    '/api/auth/forgot-password',
    `{
        "email": "{{email}}"
      }`,
    { auth: false },
  ],
  [
    'Reset Password',
    8,
    'POST',
    '/api/auth/reset-password',
    `{
        "email": "{{email}}",
        "code": "123456",
        "password": "{{password}}"
      }`,
    { auth: false },
  ],
  [
    'Resend OTP',
    9,
    'POST',
    '/api/auth/resend-otp',
    `{}`,
    {},
  ],
  [
    'Verify Account',
    10,
    'POST',
    '/api/auth/verify-account',
    `{
        "code": "123456"
      }`,
    {},
  ],
];

for (const [name, seq, method, urlPath, body, opts] of authRequests) {
  if (method === 'GET') {
    write(
      `auth/${name.replace(/ /g, '')}.yml`,
      `info:
  name: ${name}
  type: http
  seq: ${seq}

http:
  method: GET
  url: "{{baseUrl}}${urlPath}"
  headers:
    - name: Authorization
      value: "Bearer {{token}}"

settings:
  encodeUrl: true
`
    );
  } else {
    write(`auth/${name.replace(/ /g, '')}.yml`, httpJson(name, seq, method, urlPath, body, opts));
  }
}

// --- GraphQL root ---
write('graphql/folder.yml', folderYaml('GraphQL', 2));

write(
  'graphql/Health.yml',
  gql(
    'Health',
    1,
    `query Health {
          health {
            status
            timestamp
          }
        }`
  )
);

function writeDomain(folder, seq, requests) {
  write(`graphql/${folder}/folder.yml`, folderYaml(folder, seq));
  let i = 1;
  for (const [name, query, variables] of requests) {
    const safe = name.replace(/[^a-zA-Z0-9]/g, '');
    write(`graphql/${folder}/${safe}.yml`, gql(name, i++, query, variables));
  }
}

// Habits
writeDomain('Habits', 3, [
  [
    'Habits',
    `query Habits($isActive: Boolean, $page: Int) {
  habits(isActive: $isActive, page: $page, limit: 20) {
    habits { id name isActive streak maxStreak categoryId }
    total page limit
  }
}`,
    `{
  "isActive": true,
  "page": 1
}`,
  ],
  [
    'Habit',
    `query Habit($id: ID!) {
  habit(id: $id) {
    id name description frequency targetCount streak maxStreak
    category { id name color }
    followUps(limit: 30) { id date count time isAccomplished isFailed }
    stats { totalCompletions currentStreak streak maxStreak }
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'HabitMyDay',
    `query HabitMyDay($date: String!) {
  habitMyDay(date: $date) {
    habit { id name streak isCounter isTimer dailyGoal }
    followUp { id count time isAccomplished isFailed }
  }
}`,
    `{ "date": "2026-05-19" }`,
  ],
  [
    'HabitCategories',
    `query HabitCategories {
  habitCategories { id name orderIndex icon color }
}`,
    null,
  ],
  [
    'HabitMeasures',
    `query HabitMeasures {
  habitMeasures { id name abbreviation type }
}`,
    null,
  ],
  [
    'HabitFollowUps',
    `query HabitFollowUps($habitId: ID, $from: String, $to: String) {
  habitFollowUps(habitId: $habitId, from: $from, to: $to) {
    id habitId date count time isAccomplished isFailed
  }
}`,
    `{
  "habitId": "1",
  "from": "2026-05-01",
  "to": "2026-05-31"
}`,
  ],
  [
    'HabitFollowUpsInDates',
    `query HabitFollowUpsInDates($from: String!, $to: String!) {
  habitFollowUpsInDates(from: $from, to: $to) {
    date
    followUps { id habitId date isAccomplished }
  }
}`,
    `{
  "from": "2026-05-01",
  "to": "2026-05-31"
}`,
  ],
  [
    'HabitStats',
    `query HabitStats($habitId: ID!) {
  habitStats(habitId: $habitId) {
    totalCompletions totalCount currentStreak last30Days streak maxStreak
  }
}`,
    `{ "habitId": "1" }`,
  ],
  [
    'HabitAdd',
    `mutation HabitAdd($input: HabitInput!) {
  habitAdd(input: $input) { id name streak categoryId }
}`,
    `{
  "input": {
    "name": "Drink water",
    "shouldKeep": true,
    "isCounter": true,
    "dailyGoal": 8
  }
}`,
  ],
  [
    'HabitEdit',
    `mutation HabitEdit($input: HabitEditInput!) {
  habitEdit(input: $input) { id name isActive streak }
}`,
    `{
  "input": {
    "id": "1",
    "name": "Drink water (updated)"
  }
}`,
  ],
  [
    'HabitRemove',
    `mutation HabitRemove($id: ID!) {
  habitRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'HabitLogAdd',
    `mutation HabitLogAdd($input: HabitLogAddInput!) {
  habitLogAdd(input: $input) { id habitId completedDate count time }
}`,
    `{
  "input": {
    "habitId": "1",
    "completedDate": "2026-05-19",
    "count": 1
  }
}`,
  ],
  [
    'HabitFollowUpAdd',
    `mutation HabitFollowUpAdd($input: HabitFollowUpAddInput!) {
  habitFollowUpAdd(input: $input) {
    id date count time isAccomplished
    habit { id streak maxStreak }
  }
}`,
    `{
  "input": {
    "habitId": "1",
    "date": "2026-05-19",
    "time": 30,
    "isAccomplished": true
  }
}`,
  ],
  [
    'HabitFollowUpEdit',
    `mutation HabitFollowUpEdit($input: HabitFollowUpEditInput!) {
  habitFollowUpEdit(input: $input) { id count time isAccomplished }
}`,
    `{
  "input": {
    "id": "1",
    "count": 2,
    "isAccomplished": true
  }
}`,
  ],
  [
    'HabitFollowUpRemove',
    `mutation HabitFollowUpRemove($id: ID!) {
  habitFollowUpRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'HabitCategoryAdd',
    `mutation HabitCategoryAdd($input: HabitCategoryInput!) {
  habitCategoryAdd(input: $input) { id name orderIndex color }
}`,
    `{
  "input": {
    "name": "Health",
    "color": "#4CAF50",
    "orderIndex": 0
  }
}`,
  ],
  [
    'HabitCategoryEdit',
    `mutation HabitCategoryEdit($input: HabitCategoryEditInput!) {
  habitCategoryEdit(input: $input) { id name color }
}`,
    `{
  "input": {
    "id": "CATEGORY_UUID",
    "name": "Health"
  }
}`,
  ],
  [
    'HabitCategoryRemove',
    `mutation HabitCategoryRemove($id: ID!) {
  habitCategoryRemove(id: $id)
}`,
    `{ "id": "CATEGORY_UUID" }`,
  ],
  [
    'HabitMeasureAdd',
    `mutation HabitMeasureAdd($input: HabitMeasureInput!) {
  habitMeasureAdd(input: $input) { id name abbreviation }
}`,
    `{
  "input": {
    "name": "Minutes",
    "abbreviation": "min"
  }
}`,
  ],
  [
    'HabitMeasureEdit',
    `mutation HabitMeasureEdit($input: HabitMeasureEditInput!) {
  habitMeasureEdit(input: $input) { id name }
}`,
    `{
  "input": {
    "id": "MEASURE_UUID",
    "name": "Minutes"
  }
}`,
  ],
  [
    'HabitMeasureRemove',
    `mutation HabitMeasureRemove($id: ID!) {
  habitMeasureRemove(id: $id)
}`,
    `{ "id": "MEASURE_UUID" }`,
  ],
]);

// Activities
writeDomain('Activities', 4, [
  [
    'Activities',
    `query Activities($status: ActivityStatus, $categoryId: ID, $page: Int) {
  activities(status: $status, categoryId: $categoryId, page: $page, limit: 20) {
    activities {
      id title status priority categoryId
      category { id name color icon }
      spentTimeMinutes
      scheduledDate completedAt
    }
    total page limit
  }
}`,
    `{ "page": 1 }`,
  ],
  [
    'Activity',
    `query Activity($id: ID!) {
  activity(id: $id) {
    id title description status priority categoryId
    category { id name icon color }
    spentTimeMinutes
    scheduledDate completedAt
    followUps(limit: 20) {
      id date startTime durationMinutes endTime endDateTime notes
    }
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'ActivityCategories',
    `query ActivityCategories {
  activityCategories { id name orderIndex icon color description }
}`,
    null,
  ],
  [
    'ActivityCategory',
    `query ActivityCategory($id: ID!) {
  activityCategory(id: $id) { id name orderIndex icon color description }
}`,
    `{ "id": "CATEGORY_UUID" }`,
  ],
  [
    'ActivityFollowUps',
    `query ActivityFollowUps($activityId: ID, $from: String, $to: String) {
  activityFollowUps(activityId: $activityId, from: $from, to: $to) {
    id activityId date startTime durationMinutes endTime endDate endDateTime notes
  }
}`,
    `{
  "activityId": "1",
  "from": "2026-05-01",
  "to": "2026-05-31"
}`,
  ],
  [
    'ActivityDayFollowUps',
    `query ActivityDayFollowUps($date: String!) {
  activityDayFollowUps(date: $date) {
    id activityId startTime durationMinutes endDateTime
    activity { id title }
  }
}`,
    `{ "date": "2026-05-20" }`,
  ],
  [
    'ActivityFollowUpsInDates',
    `query ActivityFollowUpsInDates($from: String!, $to: String!) {
  activityFollowUpsInDates(from: $from, to: $to) {
    date
    followUps { id activityId date startTime durationMinutes endTime }
  }
}`,
    `{
  "from": "2026-05-01",
  "to": "2026-05-31"
}`,
  ],
  [
    'ActivityAdd',
    `mutation ActivityAdd($input: ActivityInput!) {
  activityAdd(input: $input) { id title status priority categoryId }
}`,
    `{
  "input": {
    "title": "Deep work",
    "priority": "high",
    "scheduledDate": "2026-05-20T09:00:00.000Z"
  }
}`,
  ],
  [
    'ActivityEdit',
    `mutation ActivityEdit($input: ActivityEditInput!) {
  activityEdit(input: $input) { id title status priority categoryId }
}`,
    `{
  "input": {
    "id": "1",
    "title": "Deep work (updated)"
  }
}`,
  ],
  [
    'ActivityRemove',
    `mutation ActivityRemove($id: ID!) {
  activityRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'ActivityComplete',
    `mutation ActivityComplete($id: ID!) {
  activityComplete(id: $id) { id status completedAt }
}`,
    `{ "id": "1" }`,
  ],
  [
    'ActivityCategoryAdd',
    `mutation ActivityCategoryAdd($input: ActivityCategoryInput!) {
  activityCategoryAdd(input: $input) { id name orderIndex color icon }
}`,
    `{
  "input": {
    "name": "Work",
    "color": "#2196F3",
    "orderIndex": 0
  }
}`,
  ],
  [
    'ActivityCategoryEdit',
    `mutation ActivityCategoryEdit($input: ActivityCategoryEditInput!) {
  activityCategoryEdit(input: $input) { id name color orderIndex }
}`,
    `{
  "input": {
    "id": "CATEGORY_UUID",
    "name": "Work (updated)"
  }
}`,
  ],
  [
    'ActivityCategoryRemove',
    `mutation ActivityCategoryRemove($id: ID!) {
  activityCategoryRemove(id: $id)
}`,
    `{ "id": "CATEGORY_UUID" }`,
  ],
  [
    'ActivityFollowUpAdd',
    `mutation ActivityFollowUpAdd($input: ActivityFollowUpAddInput!) {
  activityFollowUpAdd(input: $input) {
    id date startTime durationMinutes endTime endDate endDateTime
    activity { id title spentTimeMinutes }
  }
}`,
    `{
  "input": {
    "activityId": "1",
    "date": "2026-05-20",
    "startTime": "09:30",
    "durationMinutes": 90,
    "notes": "Focused session"
  }
}`,
  ],
  [
    'ActivityFollowUpEdit',
    `mutation ActivityFollowUpEdit($input: ActivityFollowUpEditInput!) {
  activityFollowUpEdit(input: $input) {
    id durationMinutes endTime endDateTime
  }
}`,
    `{
  "input": {
    "id": "1",
    "durationMinutes": 120
  }
}`,
  ],
  [
    'ActivityFollowUpRemove',
    `mutation ActivityFollowUpRemove($id: ID!) {
  activityFollowUpRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
]);

// Courses
writeDomain('Courses', 5, [
  [
    'Courses',
    `query Courses($page: Int) {
  courses(page: $page, limit: 20) {
    courses { id title status difficulty progress totalLessons completedLessons }
    total
  }
}`,
    `{ "page": 1 }`,
  ],
  [
    'Course',
    `query Course($id: ID!) {
  course(id: $id) {
    id title description status progress
    modules {
      id title orderIndex
      lessons { id title orderIndex completed contentType contentUrl }
    }
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'CourseProgress',
    `query CourseProgress($courseId: ID!) {
  courseProgress(courseId: $courseId) {
    courseId totalModules totalLessons completedLessons progress startedDate lastActivity
  }
}`,
    `{ "courseId": "1" }`,
  ],
  [
    'CourseAdd',
    `mutation CourseAdd($input: CourseInput!) {
  courseAdd(input: $input) { id title status }
}`,
    `{
  "input": {
    "title": "TypeScript Fundamentals",
    "difficulty": "beginner"
  }
}`,
  ],
  [
    'CourseEdit',
    `mutation CourseEdit($input: CourseEditInput!) {
  courseEdit(input: $input) { id title status }
}`,
    `{
  "input": {
    "id": "1",
    "title": "TypeScript Fundamentals (updated)"
  }
}`,
  ],
  [
    'CourseRemove',
    `mutation CourseRemove($id: ID!) {
  courseRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'CourseModuleAdd',
    `mutation CourseModuleAdd($input: CourseModuleInput!) {
  courseModuleAdd(input: $input) { id courseId title orderIndex }
}`,
    `{
  "input": {
    "courseId": "1",
    "title": "Introduction",
    "orderIndex": 0
  }
}`,
  ],
  [
    'CourseModuleEdit',
    `mutation CourseModuleEdit($input: CourseModuleEditInput!) {
  courseModuleEdit(input: $input) { id title orderIndex }
}`,
    `{
  "input": {
    "courseId": "1",
    "moduleId": "1",
    "title": "Introduction (updated)"
  }
}`,
  ],
  [
    'CourseModuleRemove',
    `mutation CourseModuleRemove($input: CourseModuleRemoveInput!) {
  courseModuleRemove(input: $input)
}`,
    `{
  "input": {
    "courseId": "1",
    "moduleId": "1"
  }
}`,
  ],
  [
    'CourseLessonAdd',
    `mutation CourseLessonAdd($input: CourseLessonInput!) {
  courseLessonAdd(input: $input) { id moduleId title orderIndex }
}`,
    `{
  "input": {
    "courseId": "1",
    "moduleId": "1",
    "title": "Welcome",
    "orderIndex": 0,
    "contentType": "video"
  }
}`,
  ],
  [
    'CourseLessonEdit',
    `mutation CourseLessonEdit($input: CourseLessonEditInput!) {
  courseLessonEdit(input: $input) { id title orderIndex }
}`,
    `{
  "input": {
    "courseId": "1",
    "moduleId": "1",
    "lessonId": "1",
    "title": "Welcome (updated)"
  }
}`,
  ],
  [
    'CourseLessonRemove',
    `mutation CourseLessonRemove($input: CourseLessonRemoveInput!) {
  courseLessonRemove(input: $input)
}`,
    `{
  "input": {
    "courseId": "1",
    "moduleId": "1",
    "lessonId": "1"
  }
}`,
  ],
  [
    'CourseLessonProgress',
    `mutation CourseLessonProgress($input: CourseLessonProgressInput!) {
  courseLessonProgress(input: $input) {
    progress { lessonId completed completionDate }
    courseStatus
  }
}`,
    `{
  "input": {
    "courseId": "1",
    "lessonId": "1",
    "completed": true
  }
}`,
  ],
]);

// Routines, Todos, Sleep, Learning
writeDomain('Routines', 6, [
  [
    'Routines',
    `query Routines($isActive: Boolean) {
  routines(isActive: $isActive, page: 1, limit: 20) {
    routines { id name timeOfDay isActive stepsCount totalDuration }
    total
  }
}`,
    `{ "isActive": true }`,
  ],
  [
    'Routine',
    `query Routine($id: ID!) {
  routine(id: $id) {
    id name description daysOfWeek timeOfDay isActive
    steps { id title orderIndex durationMinutes }
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'RoutineAdd',
    `mutation RoutineAdd($input: RoutineInput!) {
  routineAdd(input: $input) { id name isActive }
}`,
    `{
  "input": {
    "name": "Morning routine",
    "timeOfDay": "morning",
    "daysOfWeek": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }
}`,
  ],
  [
    'RoutineEdit',
    `mutation RoutineEdit($input: RoutineEditInput!) {
  routineEdit(input: $input) { id name isActive }
}`,
    `{
  "input": {
    "id": "1",
    "name": "Morning routine (updated)"
  }
}`,
  ],
  [
    'RoutineRemove',
    `mutation RoutineRemove($id: ID!) {
  routineRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'RoutineSetActive',
    `mutation RoutineSetActive($id: ID!) {
  routineSetActive(id: $id) { id name isActive }
}`,
    `{ "id": "1" }`,
  ],
  [
    'RoutineToggleActive',
    `mutation RoutineToggleActive($id: ID!) {
  routineToggleActive(id: $id) { id name isActive }
}`,
    `{ "id": "1" }`,
  ],
  [
    'RoutineStepAdd',
    `mutation RoutineStepAdd($input: RoutineStepInput!) {
  routineStepAdd(input: $input) { id routineId title orderIndex }
}`,
    `{
  "input": {
    "routineId": "1",
    "title": "Stretch",
    "orderIndex": 0,
    "durationMinutes": 5
  }
}`,
  ],
  [
    'RoutineStepEdit',
    `mutation RoutineStepEdit($input: RoutineStepEditInput!) {
  routineStepEdit(input: $input) { id title orderIndex }
}`,
    `{
  "input": {
    "routineId": "1",
    "stepId": "1",
    "title": "Stretch (updated)"
  }
}`,
  ],
  [
    'RoutineStepRemove',
    `mutation RoutineStepRemove($input: RoutineStepRemoveInput!) {
  routineStepRemove(input: $input)
}`,
    `{
  "input": {
    "routineId": "1",
    "stepId": "1"
  }
}`,
  ],
]);

writeDomain('Todos', 7, [
  [
    'Todos',
    `query Todos($status: TodoStatus) {
  todos(status: $status, page: 1, limit: 20) {
    todos { id title status priority dueDate subtasksCount { total completed } }
    total
  }
}`,
    `{}`,
  ],
  [
    'Todo',
    `query Todo($id: ID!) {
  todo(id: $id) {
    id title description status priority dueDate
    subtasks { id title isCompleted orderIndex }
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'TodoAdd',
    `mutation TodoAdd($input: TodoInput!) {
  todoAdd(input: $input) { id title status priority }
}`,
    `{
  "input": {
    "title": "Buy groceries",
    "priority": "high"
  }
}`,
  ],
  [
    'TodoEdit',
    `mutation TodoEdit($input: TodoEditInput!) {
  todoEdit(input: $input) { id title status }
}`,
    `{
  "input": {
    "id": "1",
    "title": "Buy groceries (updated)"
  }
}`,
  ],
  [
    'TodoRemove',
    `mutation TodoRemove($id: ID!) {
  todoRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'TodoComplete',
    `mutation TodoComplete($id: ID!) {
  todoComplete(id: $id) { id status completedAt }
}`,
    `{ "id": "1" }`,
  ],
  [
    'TodoSubtaskAdd',
    `mutation TodoSubtaskAdd($input: TodoSubtaskInput!) {
  todoSubtaskAdd(input: $input) { id todoId title isCompleted }
}`,
    `{
  "input": {
    "todoId": "1",
    "title": "Milk",
    "orderIndex": 0
  }
}`,
  ],
  [
    'TodoSubtaskEdit',
    `mutation TodoSubtaskEdit($input: TodoSubtaskEditInput!) {
  todoSubtaskEdit(input: $input) { id title isCompleted }
}`,
    `{
  "input": {
    "todoId": "1",
    "subtaskId": "1",
    "isCompleted": true
  }
}`,
  ],
  [
    'TodoSubtaskRemove',
    `mutation TodoSubtaskRemove($input: TodoSubtaskRemoveInput!) {
  todoSubtaskRemove(input: $input)
}`,
    `{
  "input": {
    "todoId": "1",
    "subtaskId": "1"
  }
}`,
  ],
]);

writeDomain('Sleep', 8, [
  [
    'SleepLogs',
    `query SleepLogs {
  sleepLogs(page: 1, limit: 30) {
    sleepLogs { id sleepDate durationHours quality moodOnWaking }
    total
  }
}`,
    null,
  ],
  [
    'SleepLog',
    `query SleepLog($id: ID!) {
  sleepLog(id: $id) {
    id sleepDate bedtime wakeTime durationMinutes durationHours quality notes
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'SleepStats',
    `query SleepStats {
  sleepStats {
    totalNights avgDurationHours minDurationHours maxDurationHours
    qualityDistribution { poor fair good excellent }
  }
}`,
    null,
  ],
  [
    'SleepLogAdd',
    `mutation SleepLogAdd($input: SleepLogInput!) {
  sleepLogAdd(input: $input) { id sleepDate durationHours quality }
}`,
    `{
  "input": {
    "sleepDate": "2026-06-01",
    "bedtime": "2026-05-31T23:00:00.000Z",
    "wakeTime": "2026-06-01T07:00:00.000Z",
    "quality": "good",
    "moodOnWaking": "refreshed"
  }
}`,
  ],
  [
    'SleepLogEdit',
    `mutation SleepLogEdit($input: SleepLogEditInput!) {
  sleepLogEdit(input: $input) { id quality notes }
}`,
    `{
  "input": {
    "id": "1",
    "quality": "excellent"
  }
}`,
  ],
  [
    'SleepLogRemove',
    `mutation SleepLogRemove($id: ID!) {
  sleepLogRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
]);

writeDomain('Learning', 9, [
  [
    'LearningResources',
    `query LearningResources {
  learningResources(page: 1, limit: 20) {
    resources { id title resourceType status progressStats { totalSessions currentProgress } }
    total
  }
}`,
    null,
  ],
  [
    'LearningResource',
    `query LearningResource($id: ID!) {
  learningResource(id: $id) {
    id title resourceType status
    progressSessions { id sessionDate durationMinutes progressPercentage }
  }
}`,
    `{ "id": "1" }`,
  ],
  [
    'LearningResourceAdd',
    `mutation LearningResourceAdd($input: LearningResourceInput!) {
  learningResourceAdd(input: $input) { id title resourceType status }
}`,
    `{
  "input": {
    "title": "TypeScript Handbook",
    "resourceType": "book",
    "priority": "high"
  }
}`,
  ],
  [
    'LearningResourceEdit',
    `mutation LearningResourceEdit($input: LearningResourceEditInput!) {
  learningResourceEdit(input: $input) { id title status }
}`,
    `{
  "input": {
    "id": "1",
    "status": "in_progress"
  }
}`,
  ],
  [
    'LearningResourceRemove',
    `mutation LearningResourceRemove($id: ID!) {
  learningResourceRemove(id: $id)
}`,
    `{ "id": "1" }`,
  ],
  [
    'LearningProgressAdd',
    `mutation LearningProgressAdd($input: LearningProgressInput!) {
  learningProgressAdd(input: $input) { id resourceId durationMinutes progressPercentage }
}`,
    `{
  "input": {
    "resourceId": "1",
    "durationMinutes": 45,
    "progressPercentage": 25
  }
}`,
  ],
  [
    'LearningProgressEdit',
    `mutation LearningProgressEdit($input: LearningProgressEditInput!) {
  learningProgressEdit(input: $input) { id progressPercentage }
}`,
    `{
  "input": {
    "resourceId": "1",
    "sessionId": "1",
    "progressPercentage": 50
  }
}`,
  ],
  [
    'LearningProgressRemove',
    `mutation LearningProgressRemove($input: LearningProgressRemoveInput!) {
  learningProgressRemove(input: $input)
}`,
    `{
  "input": {
    "resourceId": "1",
    "sessionId": "1"
  }
}`,
  ],
]);

// Wallet / Shopping (summary)
writeDomain('Wallet', 10, [
  [
    'Wallets',
    `query Wallets {
  wallets { id name balance isMain icon }
}`,
    null,
  ],
  [
    'Wallet',
    `query Wallet($id: ID!) {
  wallet(id: $id) { id name balance isMain initialBalance }
}`,
    `{ "id": "WALLET_UUID" }`,
  ],
  [
    'WalletAdd',
    `mutation WalletAdd($input: WalletInput!) {
  walletAdd(input: $input) { id name balance isMain }
}`,
    `{
  "input": {
    "name": "Main",
    "initialBalance": "1000.00",
    "isMain": true
  }
}`,
  ],
  [
    'WalletUpdate',
    `mutation WalletUpdate($id: ID!, $input: WalletUpdateInput!) {
  walletUpdate(id: $id, input: $input) { id name balance }
}`,
    `{
  "id": "WALLET_UUID",
  "input": { "name": "Main wallet" }
}`,
  ],
  [
    'WalletRemove',
    `mutation WalletRemove($id: ID!) {
  walletRemove(id: $id)
}`,
    `{ "id": "WALLET_UUID" }`,
  ],
]);

writeDomain('Shopping', 11, [
  [
    'ShoppingLists',
    `query ShoppingLists {
  shoppingLists(page: 1, limit: 20) {
    shoppingLists { id name }
    total
  }
}`,
    null,
  ],
  [
    'ShoppingList',
    `query ShoppingList($id: ID!) {
  shoppingList(id: $id) {
    id name
    listItems { id quantity isPurchased item { id name price } }
  }
}`,
    `{ "id": "LIST_UUID" }`,
  ],
  [
    'ShoppingListAdd',
    `mutation ShoppingListAdd($input: ShoppingListInput!) {
  shoppingListAdd(input: $input) { id name }
}`,
    `{ "input": { "name": "Weekly groceries" } }`,
  ],
  [
    'ShoppingCatalogItems',
    `query ShoppingCatalogItems {
  shoppingCatalogItems(page: 1, limit: 50) {
    items { id name price }
    total
  }
}`,
    null,
  ],
]);

// Expenses
writeDomain('Expenses', 12, [
  [
    'WalletExpenses',
    `query WalletExpenses($walletId: ID) {
  walletExpenses(walletId: $walletId) {
    id description date debit credit isIncome isOutcome
  }
}`,
    `{ "walletId": "WALLET_UUID" }`,
  ],
  [
    'WalletExpenseAdd',
    `mutation WalletExpenseAdd($input: WalletExpenseInput!) {
  walletExpenseAdd(input: $input) { id description date debit credit }
}`,
    `{
  "input": {
    "walletId": "WALLET_UUID",
    "date": "2026-05-19",
    "description": "Coffee",
    "debit": "3.50",
    "isOutcome": true
  }
}`,
  ],
]);

console.log(`Bruno collection generated at: ${ROOT}`);
const count = (dir) => {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += count(p);
    else if (e.name.endsWith('.yml')) n++;
  }
  return n;
};
console.log(`YAML files: ${count(ROOT)}`);
