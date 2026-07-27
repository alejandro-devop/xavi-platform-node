import { z } from 'zod';

const activityIdString = z.string().regex(/^\d+$/, 'Invalid activity ID');
const itemIdString = z.string().regex(/^\d+$/, 'Invalid day plan item ID');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (use HH:mm or HH:mm:ss)');

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':');
  return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
}

const clientIdOptional = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'clientId must be a UUID v7'
  )
  .optional();

const dayPlanSetItemSchema = z
  .object({
    activityId: activityIdString,
    startTime: timeString,
    endTime: timeString,
    orderIndex: z.number().int().min(0).optional(),
    clientId: clientIdOptional,
  })
  .refine((d) => timeToMinutes(d.endTime) > timeToMinutes(d.startTime), {
    message: 'endTime must be after startTime',
  });

export const activityDayPlanArgsSchema = z.object({
  date: dateString,
});

export const activityDayPlanSetInputSchema = z.object({
  date: dateString,
  items: z.array(dayPlanSetItemSchema).max(50),
});

export const activityDayPlanItemAddInputSchema = z
  .object({
    date: dateString,
    activityId: activityIdString,
    startTime: timeString,
    endTime: timeString,
    orderIndex: z.number().int().min(0).optional(),
    clientId: clientIdOptional,
  })
  .refine((d) => timeToMinutes(d.endTime) > timeToMinutes(d.startTime), {
    message: 'endTime must be after startTime',
  });

export const activityDayPlanItemEditInputSchema = z
  .object({
    itemId: itemIdString,
    startTime: timeString.optional(),
    endTime: timeString.optional(),
    orderIndex: z.number().int().min(0).optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.startTime !== undefined ||
      d.endTime !== undefined ||
      d.orderIndex !== undefined ||
      d.isCompleted !== undefined,
    { message: 'At least one field is required to update' }
  )
  .refine(
    (d) =>
      d.startTime === undefined ||
      d.endTime === undefined ||
      timeToMinutes(d.endTime) > timeToMinutes(d.startTime),
    { message: 'endTime must be after startTime' }
  );

export const activityDayPlanItemRemoveInputSchema = z.object({
  itemId: itemIdString,
});
