const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

import mongoose from "mongoose";
import { MESSAGE } from "../../../../../global-variable.js";
import Modal from "../../../../../models/planner.js";

const PlannerValidator = {
  /**This function is used to validate save api */
  save: async (req, res, next) => {
    await global.validateTextField(req, "name", global.msg(req, res, "planner_err_name_is_required"));

    // outfit_id and item_id are optional – at least one can be sent, or none
    await body("outfit_id").optional({ values: "falsy" }).isMongoId().withMessage("Invalid outfit ID").run(req);
    await body("item_id")
      .optional({ values: "falsy" })
      .custom((value) => {
        if (value === undefined || value === null || value === "") return true;
        const ids = Array.isArray(value) ? value : [value];
        for (const id of ids) {
          if (id == null || id === "" || !mongoose.isValidObjectId(String(id))) {
            throw new Error("Invalid item ID");
          }
        }
        return true;
      })
      .run(req);

    await global.validateTextField(req, "event_date", global.msg(req, res, "planner_err_event_date_is_required"));
    // await global.validateTextField(req, "event_time", global.msg(req, res, "planner_err_event_time_is_required"));
    // await global.validateTextField(req, "notes", global.msg(req, res, "planner_err_notes_is_required"));

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

  /** optional item_id on edit: single id or array of ids */
  editItemIds: async (req, res, next) => {
    await body("item_id")
      .optional({ values: "falsy" })
      .custom((value) => {
        if (value === undefined || value === null || value === "") return true;
        const ids = Array.isArray(value) ? value : [value];
        for (const id of ids) {
          if (id == null || id === "" || !mongoose.isValidObjectId(String(id))) {
            throw new Error("Invalid item ID");
          }
        }
        return true;
      })
      .run(req);

    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) {
      return next();
    }
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

  changeStatus: async (req, res, next) => {
    await body("o_id")
      .notEmpty()
      .withMessage("admin_err_o_id_is_required")
      .custom((value) => {
        try {
          const ids = JSON.parse(value);

          if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error("Invalid json array of ID's");
          }

          for (const id of ids) {
            if (!ObjectId.isValid(id)) {
              throw new Error("Invalid ID");
            }
          }

          return true;
        } catch (err) {
          throw new Error("Invalid json array of ID's");
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

export default PlannerValidator;
