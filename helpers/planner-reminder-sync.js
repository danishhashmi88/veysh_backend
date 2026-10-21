import planner from "../models/planner.js";
import UserModel from "../models/users.js";
import Notifications from "../models/notifications.js";
import { NOTIFICATIONS_TYPES } from "../global-variable.js";
import { sendFCMToToken } from "./firebase-notification.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const parseEventHourMinute = (value) => {
  if (!value || typeof value !== "string") return null;
  const raw = value.trim();

  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hour = Number(m12[1]);
    const minute = Number(m12[2]);
    const meridiem = m12[3].toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
    return null;
  }

  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour = Number(m24[1]);
    const minute = Number(m24[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  return null;
};

const getEventDateTimeUtc = (plannerDoc) => {
  if (!plannerDoc?.event_date) return null;
  const dateOnly = new Date(plannerDoc.event_date);
  if (Number.isNaN(dateOnly.getTime())) return null;

  const parsed = parseEventHourMinute(plannerDoc.event_time);
  if (!parsed) return null;

  const year = dateOnly.getUTCFullYear();
  const month = dateOnly.getUTCMonth();
  const day = dateOnly.getUTCDate();

  const utcMs = Date.UTC(year, month, day, parsed.hour, parsed.minute) - IST_OFFSET_MS;
  return new Date(utcMs);
};

const getReminderRules = (plannerDoc) => {
  const eventAt = getEventDateTimeUtc(plannerDoc);
  if (!eventAt) return [];

  const reminders = [];
  if (plannerDoc.remind_me_2hours_before && !plannerDoc.notified_2hours) {
    reminders.push({
      type: "2hours",
      remindAt: new Date(eventAt.getTime() - 2 * 60 * 60 * 1000),
      notifiedField: "notified_2hours",
      label: "in 2 hours",
    });
  }
  if (plannerDoc.remind_me_1day_before && !plannerDoc.notified_1day) {
    reminders.push({
      type: "1day",
      remindAt: new Date(eventAt.getTime() - 24 * 60 * 60 * 1000),
      notifiedField: "notified_1day",
      label: "tomorrow",
    });
  }
  if (plannerDoc.remind_me_2day_before && !plannerDoc.notified_2day) {
    reminders.push({
      type: "2day",
      remindAt: new Date(eventAt.getTime() - 48 * 60 * 60 * 1000),
      notifiedField: "notified_2day",
      label: "in 2 days",
    });
  }
  return reminders;
};

const sendPlannerReminder = async (plannerDoc, reminderRule) => {
  const claim = await planner.updateOne(
    {
      _id: plannerDoc._id,
      [reminderRule.notifiedField]: false,
    },
    {
      $set: {
        [reminderRule.notifiedField]: true,
      },
    },
  );

  if (!claim?.modifiedCount) {
    return { sent: false, reason: "already_claimed" };
  }

  const user = await UserModel.findById(plannerDoc.createdBy)
    .select("fcm_token notification_settings first_name name")
    .lean();

  if (!user) {
    return { sent: false, reason: "user_not_found" };
  }

  const eventName = plannerDoc.name || "Your planned outfit";
  const title = "Outfit Reminder";
  const body = `${eventName} is ${reminderRule.label}.`;
  const data = {
    type: NOTIFICATIONS_TYPES.OUTFIT_REMINDER,
    plannerId: String(plannerDoc._id),
    reminderType: reminderRule.type,
    eventDate: new Date(plannerDoc.event_date).toISOString(),
    eventTime: plannerDoc.event_time || "",
  };

  const allowPush = user.notification_settings?.push?.outfit_reminders !== false;
  if (!allowPush) {
    return { sent: false, reason: "push_disabled" };
  }

  try {
    await Notifications.create({
      userId: plannerDoc.createdBy,
      type: NOTIFICATIONS_TYPES.OUTFIT_REMINDER,
      title,
      body,
      data: {
        plannerId: String(plannerDoc._id),
        reminderType: reminderRule.type,
        eventDate: new Date(plannerDoc.event_date).toISOString(),
        eventTime: plannerDoc.event_time || "",
      },
      actorUserId: null,
      read: false,
    });
  } catch (err) {
    console.warn("[PlannerReminder] DB save failed:", err?.message || err);
  }

  if (user.fcm_token) {
    await sendFCMToToken(user.fcm_token, { title, body, data });
  }

  return { sent: true };
};

export const runPlannerReminderJob = async (now = new Date()) => {
  const lowerBound = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const upperBound = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const candidates = await planner
    .find({
      event_date: { $gte: lowerBound, $lte: upperBound },
      $or: [
        { remind_me_2hours_before: true, notified_2hours: false },
        { remind_me_1day_before: true, notified_1day: false },
        { remind_me_2day_before: true, notified_2day: false },
      ],
    })
    .select(
      "_id name createdBy event_date event_time remind_me_2hours_before remind_me_1day_before remind_me_2day_before notified_2hours notified_1day notified_2day",
    )
    .lean();

  let scanned = 0;
  let notified = 0;

  for (const plannerDoc of candidates) {
    scanned += 1;
    const reminders = getReminderRules(plannerDoc);
    for (const reminderRule of reminders) {
      if (now < reminderRule.remindAt) continue;
      const result = await sendPlannerReminder(plannerDoc, reminderRule);
      if (result.sent) notified += 1;
    }
  }

  return { scanned, notified };
};
