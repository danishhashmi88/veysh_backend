import mongoose from "mongoose";
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

const ObjectId = mongoose.Types.ObjectId;
import { MESSAGE } from "../../../../../global-variable.js";
import Modal from "../../../../../models/user-subscription.js";
import subscription from "../../../../../models/subscription.js";

const PurchaseValidator = {
  /**Validate buy now - subscription_id must exist in plans */
  save: async (req, res, next) => {
    await global.validateObjId(
      req,
      "subscription_id",
      { findInDb: true, DBField: "_id", DB: subscription },
      { required: "user_err_subscription_id_is_required" },
    );
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) return next();
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

  /**This function is used to validate edit get api */
  details: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Modal, query: true },
      {
        required: "admin_err_o_id_is_required",
      },
    );
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /**This function is used to validate upgrade api - subscription_id must exist in plans */
  upgrade: async (req, res, next) => {
    await global.validateObjId(
      req,
      "subscription_id",
      { findInDb: true, DBField: "_id", DB: subscription },
      {
        required: "user_err_subscription_id_is_required",
      },
    );

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  changeStatus: async (req, res, next) => {
    await body("o_id")
      .notEmpty()
      .withMessage("admin_err_o_id_is_required")
      .custom((value) => {
        try {
          const ids = JSON.parse(value);

          if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error("Invalid json of ids");
          }

          for (const id of ids) {
            if (!ObjectId.isValid(id)) {
              throw new Error("Invalid id");
            }
          }

          return true;
        } catch (err) {
          throw new Error("Invalid json of ids");
        }
      })
      .run(req);

    await global.validateStatusField(req, "status", "admin_err_status_is_required");

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /**Razorpay create order - subscription_id = plan id */
  createOrder: async (req, res, next) => {
    await global.validateObjId(
      req,
      "subscription_id",
      { findInDb: true, DBField: "_id", DB: subscription },
      { required: "user_err_subscription_id_is_required" },
    );
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) return next();
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

  /**Razorpay verify payment - subscription_id (plan), razorpay_order_id, razorpay_payment_id, razorpay_signature */
  verifyPayment: async (req, res, next) => {
    await body("subscription_id").notEmpty().withMessage("user_err_subscription_id_is_required").run(req);
    await body("razorpay_order_id").notEmpty().withMessage("razorpay_order_id_required").run(req);
    await body("razorpay_payment_id").notEmpty().withMessage("razorpay_payment_id_required").run(req);
    await body("razorpay_signature").notEmpty().withMessage("razorpay_signature_required").run(req);
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) return next();
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

  /**Cancel - subscription_id = user_subscription record _id (must belong to this user; controller checks active vs already cancelled) */
  cancelSubscription: async (req, res, next) => {
    await global.validateObjId(
      req,
      "subscription_id",
      {
        findInDb: true,
        DBField: "_id",
        DB: Modal,
        findJson: { user_id: req.user._id },
      },
      { required: "user_err_subscription_id_is_required" },
    );
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) return next();
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },
};

export default PurchaseValidator;
