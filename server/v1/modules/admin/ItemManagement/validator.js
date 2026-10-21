import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Items from "../../../../../models/items.js";
const ObjectId = mongoose.Types.ObjectId;
import { MESSAGE, PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";


const itemValidator = {
  /**This function is used to validate edit get api */
  details: async (req, res, next) => {
    await global.validateObjId(req, "o_id", {
      findInDb: true,
      DBField: "_id",
      DB: Items,
      query: true,
    });
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /**This function is used to validate changestatus api */


  changeStatus: async (req, res, next) => {
    await body("o_id")
      .trim()
      .not()
      .isEmpty()
      .withMessage("admin_err_o_id_is_required")
      .custom((value) => {
        return new Promise((resolve, reject) => {
          try {
            let ids = JSON.parse(req.body.o_id);
            ids.forEach((id, i) => {
              if (ObjectId.isValid(id)) {
                if (i == ids.length - 1) {
                  resolve();
                }
              } else {
                reject("Invalid id");
              }
            });
          } catch (err) {
            return reject("Invalid json of ids");
          }
        });
      })
      .run(req);
    await global.validateStatusField(req, "status", "admin_err_status_is_required");

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  delete: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { findInDb: true, DBField: "_id", DB: Items, query: true },
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


export default itemValidator;