import global from "../../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../../global-variable.js";
import { body, query, validationResult } from "express-validator";
import MessagesModel from "../../../../../models/messages.js";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

const chatValidator = {
  getMessages: async (req, res, next) => {
    await query("room").trim().notEmpty().withMessage("room is required").run(req);
    await query("search").optional().trim().run(req);
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
    next();
  },

  receiverInfo: async (req, res, next) => {
    await query("to").optional().run(req);
    await query("receiver_id").optional().run(req);
    if (!req.query.to && !req.query.receiver_id) {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, [{ msg: "to or receiver_id is required" }]);
    }
    next();
  },

  deleteMessage: async (req, res, next) => {
    await body("_id").trim().notEmpty().withMessage("_id is required").run(req);
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
    const msg = await MessagesModel.findOne({ _id: new ObjectId(req.body._id) });
    if (!msg) {
      return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
    }
    if (String(msg.sender_id) !== String(req.user._id)) {
      return global.failResponse(res, "You can only delete your own messages", {}, 403);
    }
    next();
  },

  editMessage: async (req, res, next) => {
    await body("_id").trim().notEmpty().withMessage("_id is required").run(req);
    await body("message").trim().notEmpty().withMessage("message is required").run(req);
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
    const msg = await MessagesModel.findOne({ _id: new ObjectId(req.body._id) });
    if (!msg) {
      return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
    }
    if (String(msg.sender_id) !== String(req.user._id)) {
      return global.failResponse(res, "You can only edit your own messages", {}, 403);
    }
    next();
  },

  clearChat: async (req, res, next) => {
    await body("room").trim().notEmpty().withMessage("room is required").run(req);
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
    next();
  },
};

export default chatValidator;
