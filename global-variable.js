import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* user role */
export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  STYLIST: "stylist",
  USER: "user"
};

export const STATUS_ERROR = 400;
export const STATUS_SUCCESS = 200;
export const STATUS_UNAUTHORIZED = 401;
export const STATUS_NOT_FOUND = 404;
export const INTERNAL_SERVER_ERROR = 500;

export const JWT_CONFIG = {
  algorithm: "RS256",
  expire_time: "50h",
  // expire_time : '5s'
};

export const ERROR_MESSAGE = "Something went wrong, please try again later";
export const LOGIN_BLOCK_TIME = 60; /** Minutes */
export const LOGIN_FAIL_ATTEMPTS = 15;

export const ROOT_DIR_PATH = __dirname + "/";
export const PUBLIC_DIR_PATH = __dirname + "/public/";
export const UPLOAD_FILE_PATH = __dirname + "/public/uploads/";
export const FILES_URL = process.env.BASE_URL + "/uploads/";

/** Sorting related */
export const SORT_A = 1;
export const SORT_D = -1;

/** password security related */
export const BCRYPT_SALT_ROUNDS = 10;
export const PASSWORD_MIN_LENGTH = 8;

/** Pagination related */
export const PER_PAGE_RECORDS = 10;

/** Status related */
export const ACTIVE = 1;
export const DE_ACTIVE = 0;

export const UPLOADED_DEFAULT_URL = FILES_URL + "default" + "/";

export const DEFAULT_SORTING = {
  createdAt: SORT_D,
};

/** Validation related */
export const ALLOWED_IMAGE_EXT = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**Email template layout */
export const EMAIL_TEMPLATE_LAYOUT = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width"/><meta charSet="utf-8"/>
<title>Email</title>
<link rel="icon" href="../static/favicon.ico"/>
</head>
<body>{{MESSAGE_BODY}}</body>
</html>`;
export const EMPTY_SHORT_CODE_VALUE = "-";

export const MESSAGE = {
  SAVED: "msg_added",
  EDITED: "msg_edited",
  DELETED: "msg_deleted_successfully",
  STATUS_CHANGE: "msg_status_changed_successfully",
  RECORD_NOT_FOUND: "msg_record_not_found",
  SOMETHING_WENT_WRONG: "msg_something_went_wrong",
  OPR_SUCCESS: "msg_operation_success",
  INVALID_REQUEST: "invalid_request",
  RESTAURANT_ADDED: "rest_added_sucessfully",
  ENROLLMENT_COMPLETED: "enrollment_completed",
  EMAIL_ALREADY_EXIST: "err_already_email_list",
};

export const URL_REGEX = /(http(s?)):\/\//i;

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DEFAULT_USER_PROFILE = "default_user_profile.png";
export const ADMIN_OTP_DIGITS = 6;
export const USER_OTP_DIGITS = 6;
export const OTP_EXPIRE_LIMIT = 10; /** In minutes */

/**Uploaded files url */

/** Chat & Notifications */
export const MESSAGE_TYPES = {
  TEXT: "text",
  IMAGE: "image",
  EMOJI: "emoji",
  FILE: "file",
};

export const NOTIFICATIONS_TYPES = {
  DEFAULT: "default",
  UNREAD_CHAT_MESSAGE: "unread_chat_message",
  POST_LIKE: "post_like",
  POST_COMMENT: "post_comment",
  POST_TAG: "post_tag",
  POST_FOLLOW: "post_follow",
  USER_FOLLOW: "user_follow",
  OUTFIT_REMINDER: "outfit_reminder"
};

export const UPLOADED_BANNERS_URL = FILES_URL + "banners/";

export const UPLOADED_CATEGORIES_URL = FILES_URL + "categories/";

export const UPLOADED_ITEMS_URL = FILES_URL + "items/";

export const ALLOWED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".bmp"];
export const ALLOWED_AUDIO_EXTENSIONS = [".wav", ".mp3"];
export const ALLOWED_OFFICE_EXTENSIONS = [".pdf", ".docx", ".xls", ".csv", ".xlsx"];

export const CMS_PAGES_POSITIONS = {
  HEADER: "header",
  FOOTER: "footer",
  OTHER: "other",
  NONE: "none",
};

export const MAIL_DEFAULT_SHORT_CODES = {
  web_url: process.env.WEB_URL,
};
export const EMAIL_TEMPLATE_TYPES = {
  DEFAULT: "default",
};

export default {
  USER_ROLES,
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_UNAUTHORIZED,
  STATUS_NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  JWT_CONFIG,
  ERROR_MESSAGE,
  LOGIN_BLOCK_TIME,
  LOGIN_FAIL_ATTEMPTS,
  ROOT_DIR_PATH,
  PUBLIC_DIR_PATH,
  UPLOAD_FILE_PATH,
  FILES_URL,
  ACTIVE,
  DE_ACTIVE,
};
