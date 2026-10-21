const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

import mongoose from "mongoose";
import { MESSAGE } from "../../../../../global-variable.js";
import Modal from "../../../../../models/outfit.js";

const outfitValidator = {
  /**This function is used to validate save api */
  save: async (req, res, next) => {
    await global.validateTextField(req, "name", global.msg(req, res, "outfit_err_name_is_required"));

    await body("category")
      .notEmpty()
      .withMessage(global.msg(req, res, "outfit_err_category_is_required"))
      .custom((value) => {
        try {
          const categories = typeof value === "string" && (value.startsWith("[") || value.startsWith("{")) ? JSON.parse(value) : value;
          const categoryArray = Array.isArray(categories) ? categories : [categories];

          if (categoryArray.length === 0) {
            throw new Error("Category must be a non-empty array");
          }

          for (const id of categoryArray) {
            if (!ObjectId.isValid(id)) {
              throw new Error("Invalid category ID");
            }
          }
          return true;
        } catch (err) {
          throw new Error(err.message);
        }
      })
      .run(req);
    // await global.validateTextField(req, "sub_category", global.msg(req, res, "outfit_err_sub_category_is_required"));


    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    }
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

  /**This function is used to validate edit api */
  edit: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Modal },
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

  enableRentByOutfitId: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Modal },
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

  changeStatus: async (req, res, next) => {
    await body("o_id")
      .notEmpty()
      .withMessage("admin_err_o_id_is_required")
      .custom((value) => {
        try {
          const ids = JSON.parse(value);

          if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error("Invalid JSON array of IDs");
          }

          for (const id of ids) {
            if (!ObjectId.isValid(id)) {
              throw new Error("Invalid ID");
            }
          }

          return true;
        } catch (err) {
          throw new Error("Invalid JSON array of IDs");
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

  /**This function is used to validate delete api */
  delete: async (req, res, next) => {
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
};

export default outfitValidator;
