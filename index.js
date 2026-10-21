import express from "express";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import i18n from "i18n";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import moment from "moment";

import GFN from "./helpers/global-functions.js";
import logger from "./helpers/logger.js";
import http from "http";
import { Server } from "socket.io";
import { networkInterfaces } from "os";
import SocketHelper from "./helpers/socket.js";
import {
  addChatUser,
  removeChatUser,
  getChatOnlineUser,
  addNotificationUser,
  removeNotificationUser,
} from "./helpers/User.js";
import mongoose from "mongoose";
import UserModel from "./models/users.js";
import { FILES_URL, MESSAGE_TYPES, NOTIFICATIONS_TYPES } from "./global-variable.js";
import { sendFCMToToken } from "./helpers/firebase-notification.js";
import Notifications from "./models/notifications.js";
// import { syncWearCountFromPastEvents } from "./helpers/wear-count-sync.js";
import { runDailyOutfitSuggestionJob } from "./helpers/daily-outfit-sync.js";
import { runPlannerReminderJob } from "./helpers/planner-reminder-sync.js";

// for security purpose
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

import csurf from "csurf";
import cookieParser from "cookie-parser";
import xss from "xss";

import dotenv from "dotenv";
dotenv.config();

import serverRouter from "./routes/index.js";
dotenv.config();
const MONGO_URL = process.env.MONGO_URL;

const app = express();

// Trust the first reverse proxy (nginx/apache) so that express-rate-limit
// can correctly identify clients via the X-Forwarded-For header.
app.set("trust proxy", 1);

let serverConfig = {};
const server = http.createServer(serverConfig, app);
const io = new Server(server, { cors: { origin: "*" } });
let isWearCountSyncRunning = false;
const wearCountSyncIntervalMs = Math.max(
  Number(process.env.WEAR_COUNT_SYNC_INTERVAL_MS) || 60 * 1000,
  30 * 1000,
);

// Wear count sync job disabled intentionally.
// const runWearCountSyncJob = async () => {
//   if (isWearCountSyncRunning) return;
//   isWearCountSyncRunning = true;
//   try {
//     const result = await syncWearCountFromPastEvents();
//     console.log(
//       `✅ WearCountSync completed | processedEvents=${result.processedEvents} | incrementedItems=${result.incrementedItems}`,
//     );
//   } catch (err) {
//     console.error("[WearCountSync] Job failed:", err.message);
//   } finally {
//     isWearCountSyncRunning = false;
//   }
// };

const runDailyOutfitCronJob = async () => {
  try {
    const startedAt = new Date();
    console.log(`[DailyOutfit] Triggered at ${startedAt.toISOString()}`);
    const result = await runDailyOutfitSuggestionJob();
    console.log(
      `✅ DailyOutfit completed | totalUsers=${result.totalUsers} | generated=${result.generated} | skipped=${result.skipped} | failed=${result.failed} | skippedByReason=${JSON.stringify(result.skippedByReason || {})} | startedAt=${result.startedAt} | endedAt=${result.endedAt}`,
    );
    if (Array.isArray(result.failedUsers) && result.failedUsers.length > 0) {
      console.log(`[DailyOutfit] failedUsers(sample): ${JSON.stringify(result.failedUsers)}`);
    }
  } catch (err) {
    console.error("[DailyOutfit] Job failed:", err.message);
  }
};

const registerDailyOutfitScheduler = async () => {

  const dailyOutfitCronExpr = process.env.DAILY_OUTFIT_CRON || "0 8 * * *";
  const dailyOutfitCronTz = process.env.DAILY_OUTFIT_CRON_TZ || "Asia/Kolkata";

  try {
    const cronModule = await import("node-cron");
    const cron = cronModule.default || cronModule;
    cron.schedule(
      dailyOutfitCronExpr,
      () => {
        console.log("🕗 Running daily outfit generation...");
        runDailyOutfitCronJob();
      },
      { timezone: dailyOutfitCronTz },
    );
    console.log(`✅ DailyOutfit cron registered | expression="${dailyOutfitCronExpr}" | timezone="${dailyOutfitCronTz}"`);
  } catch (err) {
    console.warn("[DailyOutfit] node-cron not available, using fallback scheduler.");
    const fallbackIntervalMs = Math.max(
      Number(process.env.DAILY_OUTFIT_FALLBACK_INTERVAL_MS) || 60 * 1000,
      30 * 1000,
    );
    let lastRunKey = "";
    setInterval(() => {
      // Fallback uses IST explicitly so server timezone won't affect schedule.
      const nowUtc = new Date();
      const istNow = new Date(nowUtc.getTime() + 5.5 * 60 * 60 * 1000);
      const year = istNow.getUTCFullYear();
      const month = String(istNow.getUTCMonth() + 1).padStart(2, "0");
      const day = String(istNow.getUTCDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      const istHour = istNow.getUTCHours();
      const istMinute = istNow.getUTCMinutes();
      // Run within a safe minute window to avoid interval drift misses.
      if (istHour === 14 && istMinute >= 40 && istMinute <= 42 && lastRunKey !== dateKey) {
        lastRunKey = dateKey;
        console.log("🕗 Running daily outfit generation (fallback)...");
        runDailyOutfitCronJob();
      }
    }, fallbackIntervalMs);
    console.log(`✅ DailyOutfit fallback registered | dailyAt=14:40 IST | checkIntervalMs=${fallbackIntervalMs}`);
  }
};

const runPlannerReminderCronJob = async () => {
  try {
    const result = await runPlannerReminderJob();
    if (result.notified > 0) {
      console.log(`✅ PlannerReminder completed | scanned=${result.scanned} | notified=${result.notified}`);
    }
  } catch (err) {
    console.error("[PlannerReminder] Job failed:", err.message);
  }
};

const registerPlannerReminderScheduler = async () => {
  const reminderCronExpr = process.env.PLANNER_REMINDER_CRON || "*/1 * * * *";
  const reminderCronTz = process.env.PLANNER_REMINDER_CRON_TZ || "Asia/Kolkata";

  try {
    const cronModule = await import("node-cron");
    const cron = cronModule.default || cronModule;
    cron.schedule(
      reminderCronExpr,
      () => {
        runPlannerReminderCronJob();
      },
      { timezone: reminderCronTz },
    );
    console.log(`✅ PlannerReminder cron registered | expression="${reminderCronExpr}" | timezone="${reminderCronTz}"`);
  } catch (err) {
    const fallbackIntervalMs = Math.max(
      Number(process.env.PLANNER_REMINDER_FALLBACK_INTERVAL_MS) || 60 * 1000,
      30 * 1000,
    );
    setInterval(() => {
      runPlannerReminderCronJob();
    }, fallbackIntervalMs);
    console.log(`✅ PlannerReminder fallback registered | checkIntervalMs=${fallbackIntervalMs}`);
  }
};

// ----------------- Middlewares ------------------

mongoose
  .connect(MONGO_URL) // no options object needed
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// File upload
app.use(fileUpload());

// JSON and URL-encoded body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(process.cwd(), "public")));

// i18n configuration
GFN.createDir(path.join(process.cwd(), "locales"));

i18n.configure({
  locales: ["en"],
  defaultLocale: "en",
  directory: path.join(process.cwd(), "locales"),
  autoReload: true,
  updateFiles: false,
});
app.use(i18n.init);

// ----------------- Logging ----------------------
if (process.env.WRITE_LOGS === "true" || process.env.WRITE_LOGS === true) {
  app.use(
    morgan(
      (tokens, req, res) => {
        return [tokens.method(req, res), tokens.url(req, res), "-", tokens.status(req, res), tokens["response-time"](req, res), "ms", "- IP:", req.ip, "- UA:", tokens["user-agent"](req, res)].join(" ");
      },
      {
        skip: (req) => req.method === "OPTIONS",
        stream: {
          write: (message) => logger.info(message.trim()),
        },
      },
    ),
  );
}

// ----------------- Security Middlewares ------------------

// 1️⃣ Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 2️⃣ XSS Protection

// ✅ Manual sanitization middleware (Express 5 safe)
app.use((req, res, next) => {
  req.sanitized = {
    body: sanitizeObject(req.body),
    query: sanitizeObject(req.query),
    params: sanitizeObject(req.params),
  };
  next();
});

function sanitizeObject(obj) {
  if (typeof obj === "string") return xss(obj);
  if (typeof obj === "object" && obj !== null) {
    for (let key in obj) obj[key] = sanitizeObject(obj[key]);
  }
  return obj;
}

// 3️⃣ Rate Limiting (hard limit)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded: IP ${req.ip} on ${req.originalUrl}`);
    GFN.failResponse(res, "Too many requests from this IP, please try again later.", {});
  },
});
app.use(apiLimiter);

// 4️⃣ Throttling (soft delay for excessive requests)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 500,
  delayMs: (used, req) => {
    const limit = req.slowDown.limit; // 500
    return (used - limit) * 500; // delay grows with each extra request
  },
});
app.use(speedLimiter);

// 5️⃣ CSRF Protection (requires session or cookie middleware first)

// app.use(cookieParser()); // needed for csurf
//
// const csrfProtection = csurf({ cookie: true });
//
// app.use((req, res, next) => {
//   if (req.path.startsWith("/webservice/")) return next();
//   csrfProtection(req, res, next);
// });
//
// // Example: attach CSRF token to responses
// app.use((req, res, next) => {
//   if (req.csrfToken) {
//     const token = req.csrfToken();
//     // send the CSRF token in a response header
//     res.setHeader("x-csrf-token", token);
//     // optionally still send the cookie
//     res.cookie("XSRF-TOKEN", token);
//   }
//   next();
// });

// ----------------- Routes -----------------------
app.get("/", (req, res) => {
  res.send("Server is running");
});
app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ----------------- CORS -------------------------
app.use(
  cors({
    origin: (origin, callback) => {
      if (GFN.getAllowedOrigins().indexOf(origin) >= 0) {
        callback(null, true);
      } else {
        if (origin) {
          callback(`Unauthorized request from origin "${origin}"`, false);
        } else {
          callback(null, false);
        }
      }
    },
  }),
);

// ----------------- Redis Check ------------------
// (async () => {
//   try {
//     if (redisClient.isOpen) {
//       console.log("✅ Redis is connected.");
//     } else {
//       console.log("⚠️ Redis is NOT connected.");
//     }
//   } catch (err) {
//     console.error("Error checking Redis:", err);
//   }
// })();

// ----------------- Api routes ------------------
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} | status=${res.statusCode} | ${duration}ms | ip=${req.ip} | userId=${req.user?._id ?? "-"}`);
  });
  next();
});
app.use("/webservice/api", serverRouter);

// ----------------- Error handler (always JSON, never HTML) ------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || "Something went wrong",
    data: {},
    error: { message: err.message, code: err.code },
  });
});

// ----------------- Start Server -----------------

server.listen(process.env.API_PORT, async () => {
  SocketHelper.setIo(io);
  // Event-based wear count sync disabled intentionally.
  // runWearCountSyncJob();
  // setInterval(runWearCountSyncJob, wearCountSyncIntervalMs);
  await registerDailyOutfitScheduler();
  await registerPlannerReminderScheduler();

  io.on("connection", (socket) => {
    socket.on("chatJoin", (data, callback) => {
      const { sender_id, receiver_id, room } = data || {};
      if (room) {
        socket.join(room);
        addChatUser({ id: socket.id, sender_id, receiver_id, room });
        addNotificationUser({ id: socket.id, room: String(sender_id) });
      }
      if (typeof callback === "function") callback({ ok: true });
    });

    socket.on("chatSendMessage", async (data, callback) => {
      try {
        let { sender_id, receiver_id, room } = data || {};
        if (!receiver_id && room) {
          const existingMsg = await MessagesModel.findOne({ room }).lean();
          if (existingMsg) {
            receiver_id = String(existingMsg.sender_id) === String(sender_id) ? existingMsg.receiver_id : existingMsg.sender_id;
            data.receiver_id = receiver_id;
          }
        }

        if (sender_id && receiver_id && mongoose.Types.ObjectId.isValid(sender_id) && mongoose.Types.ObjectId.isValid(receiver_id)) {
          const isBlocked = await UserModel.exists({
            $or: [
              { _id: new mongoose.Types.ObjectId(sender_id), blocked_users: new mongoose.Types.ObjectId(receiver_id) },
              { _id: new mongoose.Types.ObjectId(receiver_id), blocked_users: new mongoose.Types.ObjectId(sender_id) },
            ],
          });

          if (isBlocked) {
            if (typeof callback === "function") callback({ ok: false, error: "Cannot send message. User is blocked." });
            return;
          }
        }

        data._id = data._id || new mongoose.Types.ObjectId();
        await GFN.saveMessage(data);
        if (data.file_name) {
          data.file_url = FILES_URL + "chat/" + data.file_name;
        }
        io.to(data.room).emit("chatMessage", data);
        const receiverOnline = getChatOnlineUser(data.receiver_id);
        if (!receiverOnline) {
          const senderData = await GFN.getUserData(data.sender_id);
          const receiverData = await UserModel.findById(data.receiver_id).select("fcm_token notification_settings").lean();
          const senderName = senderData?.first_name || senderData?.name || "Someone";

          const allowPush = receiverData?.notification_settings?.push?.new_messages !== false;

          if (allowPush) {
            await GFN.sendWebNotification({
              receiver_id: data.receiver_id,
              title: `New message from ${senderName}`,
              message: `${senderName} has just messaged you`,
              redirect_to: `/chat?to=${data.receiver_id}&room=${data.room}`,
              type: NOTIFICATIONS_TYPES.UNREAD_CHAT_MESSAGE,
            });

            // Create in-app notification in DB
            try {
              await Notifications.create({
                userId: data.receiver_id,
                type: NOTIFICATIONS_TYPES.UNREAD_CHAT_MESSAGE,
                title: `New message from ${senderName}`,
                body: `${senderName} has just messaged you`,
                data: { sender_id: String(data.sender_id), room: String(data.room) },
                actorUserId: data.sender_id,
              });
            } catch (dbErr) {
              console.error("[Chat Notification] DB storage error:", dbErr.message);
            }

            if (receiverData?.fcm_token) {
              const title = `New message from ${senderName}`;
              const body = `${senderName} has just messaged you`;
              const pushData = {
                type: NOTIFICATIONS_TYPES.UNREAD_CHAT_MESSAGE,
                sender_id: String(data.sender_id),
                room: String(data.room)
              };
              sendFCMToToken(receiverData.fcm_token, { title, body, data: pushData }).catch((e) => {
                console.warn("[FCM] Message notification error:", e?.message || e);
              });
            }
          } else {
            console.log("[Chat Notification] Skip all notifications - push disabled for new_messages, receiverId:", data.receiver_id);
          }
        }
        if (typeof callback === "function") callback({ ok: true });
      } catch (err) {
        if (typeof callback === "function") callback({ ok: false, error: err.message });
      }
    });

    socket.on("chatEditMessage", async (data, callback) => {
      try {
        await GFN.editMessage(data);
        io.to(data.room).emit("chatClientEditMessage", data);
        if (typeof callback === "function") callback({ ok: true });
      } catch (err) {
        if (typeof callback === "function") callback({ ok: false, error: err.message });
      }
    });

    socket.on("chatDisconnected", () => {
      removeChatUser(socket.id);
    });

    socket.on("disconnect", () => {
      removeNotificationUser(socket.id);
      removeChatUser(socket.id);
    });
  });

  console.log(`=> Server is running on ${process.env.API_PORT}!`);

  if (process.env.PRODUCTION === "false") {
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        const isIPv4 = net.family === "IPv4" || net.family === 4;
        if (isIPv4 && !net.internal) {
          console.log(`=> Your app URL is http://${net.address}:${process.env.API_PORT}`);
          return;
        }
      }
    }
  }
});

