const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";
import Model from "../../../../../models/banner.js";
import { MESSAGE } from "../../../../../global-variable.js";

const bannervalidator = {
  save: async (req, res, next) => {
    await global.validateTextField(req, "title", "admin_err_title_is_required");
    // await global.validateTextField(req, 'title_de', global.msg(req, res, 'admin_err_title_de_is_required'));
    // await global.validateTextField(
    //   req,
    //   "description",
    //   "admin_err_description_is_required"
    // );
    // await global.validateTextField(req, 'description_ja', global.msg(req, res, 'admin_err_description_ja_is_required'));

    let errors = validationResult(req).array({ onlyFirstError: true });
    /** validate file */
    if (req.files && req.files.image && Object.keys(req.files.image).length > 0) {
      /** File accepted */
    } else {
      errors.push({
        value: "",
        msg: "Image is required",
        param: "image",
        location: "files",
      });
    }

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  /**This function is used to validate edit get api */
  details: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      { query: true, findInDb: true, DBField: "_id", DB: Model },
      {
        required: "admin_err_o_id_is_required",
      }
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
      { findInDb: true, DBField: "_id", DB: Model },
      {
        required: "admin_err_o_id_is_required",
      }
    );
    await global.validateTextField(req, "title", "admin_err_title_is_required");
    // await global.validateTextField(req, 'title_de', global.msg(req, res, 'admin_err_title_de_is_required'));
    // await global.validateTextField(
    //   req,
    //   "description",
    //   "admin_err_description_is_required"
    // );
    // await global.validateTextField(req, 'description_ja', global.msg(req, res, 'admin_err_description_ja_is_required'));

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

  /**This function is used to validate delete api */
  delete: async (req, res, next) => {
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

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default bannervalidator;
