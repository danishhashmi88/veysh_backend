const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

import mongoose from "mongoose";
import { MESSAGE } from "../../../../../global-variable.js";
import Modal from "../../../../../models/items.js";

const itemsValidator = {
  /**This function is used to validate save api */
  save: async (req, res, next) => {
 
   await global.validateTextField(req, "name", global.msg(req, res, "items_err_name_is_required"));

   await global.validateTextField(req, "price", global.msg(req, res, "items_err_price_is_required"));

   await global.validateTextField(req, "brand_name", global.msg(req, res, "items_err_brand_name_is_required"));

   await global.validateTextField(req, "category", global.msg(req, res, "items_err_category_is_required"));

   await global.validateTextField(req, "sub_category", global.msg(req, res, "items_err_sub_category_is_required"));
    
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
    await global.validateTextField(req, "name", global.msg(req, res, "items_err_name_is_required"));

   await global.validateTextField(req, "price", global.msg(req, res, "items_err_price_is_required"));
   
   await global.validateTextField(req, "brand_name", global.msg(req, res, "items_err_brand_name_is_required"));

   await global.validateTextField(req, "category", global.msg(req, res, "items_err_category_is_required"));

   await global.validateTextField(req, "sub_category", global.msg(req, res, "items_err_sub_category_is_required"));
//     await global.validateTextField(req, "title", "admin_err_title_is_required");
// 
//     await global.validateTextField(req, "description", global.msg(req, res, "admin_err_description_is_required"));
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  enableRentByItemId: async (req, res, next) => {
    await global.validateObjId(
      req,
      "item_id",
      { findInDb: true, DBField: "_id", DB: Modal },
      {
        required: "item_id is required",
      },
    );

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  incrementWearCount: async (req, res, next) => {
    await global.validateObjId(
      req,
      "item_id",
      { findInDb: true, DBField: "_id", DB: Modal },
      {
        required: "item_id is required",
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

export default itemsValidator;
