const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

import mongoose from "mongoose";
import { MESSAGE } from "../../../../../global-variable.js";
import Brand from "../../../../../models/brand.js";

const brandValidator = {
  /** Validate save api */
  save: async (req, res, next) => {
    await global.validateTextField(req, "title", "admin_err_title_is_required");

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /** Validate details api */
  details: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Brand, query: true },
      {
        required: "admin_err_o_id_is_required",
      }
    );

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /** Validate edit api */
  edit: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Brand },
      {
        required: "admin_err_o_id_is_required",
      }
    );

    await global.validateTextField(req, "title", "admin_err_title_is_required");

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /** Validate change status api */
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

    await global.validateStatusField(
      req,
      "status",
      "admin_err_status_is_required"
    );

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /** Validate delete api */
  delete: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Brand, query: true },
      {
        required: "admin_err_o_id_is_required",
      }
    );

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default brandValidator;