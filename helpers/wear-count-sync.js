import mongoose from "mongoose";
import planner from "../models/planner.js";
import outfits from "../models/outfit.js";
import items from "../models/items.js";
import { ACTIVE } from "../global-variable.js";

const ObjectId = mongoose.Types.ObjectId;

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (typeof value === "string" && ObjectId.isValid(value)) return new ObjectId(value);
  if (typeof value === "object" && value?._id && ObjectId.isValid(value._id)) return new ObjectId(value._id);
  return null;
};

const getPastDateStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const parseEventHourMinute = (eventTime) => {
  if (!eventTime || typeof eventTime !== "string") return null;
  const trimmed = eventTime.trim();
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const suffix = twelveHourMatch[3].toUpperCase();
    if (suffix === "PM" && hour < 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
    return null;
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  return null;
};

const isEventDue = (plannerDoc, now = new Date()) => {
  if (!plannerDoc?.event_date) return false;
  const eventDate = new Date(plannerDoc.event_date);
  const dueAt = new Date(eventDate);
  dueAt.setUTCHours(0, 0, 0, 0);

  const parsedTime = parseEventHourMinute(plannerDoc.event_time);
  if (parsedTime) {
    dueAt.setUTCHours(parsedTime.hour, parsedTime.minute, 0, 0);
  }

  return dueAt.getTime() <= now.getTime();
};

export const syncWearCountFromPastEvents = async (userId = null) => {
  const now = new Date();
  const match = {
    event_date: { $lte: getPastDateStart() },
    wear_count_added: { $ne: true },
    $or: [
      { outfit_id: { $exists: true, $ne: null } },
      { $and: [{ item_id: { $exists: true } }, { item_id: { $ne: null } }, { item_id: { $ne: [] } }] },
    ],
  };

  const normalizedUserId = normalizeObjectId(userId);
  if (normalizedUserId) {
    match.createdBy = normalizedUserId;
  }

  const pendingEventIds = await planner.find(match).select("_id").lean();
  if (!pendingEventIds.length) {
    return { processedEvents: 0, incrementedItems: 0 };
  }

  let processedEvents = 0;
  let incrementedItems = 0;

  for (const event of pendingEventIds) {
    const plannerDoc = await planner.findOne({
      _id: event._id,
      wear_count_added: { $ne: true },
      event_date: { $lte: getPastDateStart() },
    }).lean();

    if (!plannerDoc) continue;
    if (!isEventDue(plannerDoc, now)) continue;

    // Atomic claim: only one runner can process this event.
    const claim = await planner.updateOne(
      { _id: event._id, wear_count_added: { $ne: true } },
      { $set: { wear_count_added: true } },
    );
    if (!claim.modifiedCount) continue;

    let ids = [];
    if (plannerDoc.outfit_id) {
      const outfitDoc = await outfits.findById(plannerDoc.outfit_id).select("item_id").lean();
      if (outfitDoc?.item_id) {
        ids = [...ids, ...(Array.isArray(outfitDoc.item_id) ? outfitDoc.item_id : [outfitDoc.item_id])];
      }
    }

    if (plannerDoc.item_id) {
      ids = [...ids, ...(Array.isArray(plannerDoc.item_id) ? plannerDoc.item_id : [plannerDoc.item_id])];
    }

    const uniqueItemIds = [
      ...new Set(
        ids
          .map((id) => normalizeObjectId(id))
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    ].map((id) => new ObjectId(id));

    if (uniqueItemIds.length > 0) {
      const bulkResult = await items.bulkWrite(
        uniqueItemIds.map((itemId) => ({
          updateOne: {
            filter: { _id: itemId, status: ACTIVE, createdBy: plannerDoc.createdBy },
            update: { $inc: { wear_count: 1 } },
          },
        })),
      );
      incrementedItems += bulkResult.modifiedCount || 0;
    }
    processedEvents += 1;
  }

  return { processedEvents, incrementedItems };
};

