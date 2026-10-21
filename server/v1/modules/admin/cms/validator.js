const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";
import Modal from "../../../../../models/cms.js";
import { MESSAGE } from "../../../../../global-variable.js";

const cmsValidator = {
  /**This function is used to validate save api */
  save: async (req, res, next) => {
    await global.validateTextField(req, "title", "admin_err_title_is_required");

    await global.validateTextField(req, "description", global.msgByReq(req, "admin_err_description_is_required"));

    await global.validateTextField(req, "short_description", global.msgByReq(req, "admin_err_meta_description_is_required"));
    await global.validateTextField(req, "menu_location", global.msgByReq(req, "menu_location"));
    // await body("description_ja").optional().isString().withMessage("").run(req)
    await global.validateStatusField(req, "status", "admin_err_status_is_required");
    await body("type")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Type is required")
      .isIn(["website", "app"])
      .withMessage("Invalid type")
      .run(req);

    await body("slug")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Slug is required")
      .custom((value) => {
        const findJson = {
          slug: value,
        };
        return Modal.findOne(findJson).then((record) => {
          if (record) {
            return Promise.reject();
          } else {
            return Promise.resolve();
          }
        });
      })
      .withMessage("This slug is already exists in this language")
      .run(req);
    let errors = validationResult(req).array({ onlyFirstError: true });

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
      { findInDb: true, DBField: "_id", DB: Modal, query: true },
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
      { findInDb: true, DBField: "_id", DB: Modal },
      {
        required: "admin_err_o_id_is_required",
      }
    );
    await global.validateTextField(req, "title", "admin_err_title_is_required");

    await global.validateTextField(req, "description", global.msgByReq(req, "admin_err_description_is_required"));

    await global.validateTextField(req, "short_description", global.msgByReq(req, "admin_err_meta_description_is_required"));
    await global.validateTextField(req, "menu_location", global.msgByReq(req, "menu_location"));
    // await body("description_ja").optional().isString().withMessage("").run(req)
    await global.validateStatusField(req, "status", "admin_err_status_is_required");
    await body("type")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Type is required")
      .isIn(["website", "app"])
      .withMessage("Invalid type")
      .run(req);


    await body("slug")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Slug is required")
      .custom((value) => {
        if (ObjectId.isValid(req.body.o_id)) {
          const findJson = {
            slug: value,
            _id: { $ne: new ObjectId(req.body.o_id) },
          };
          return Modal.findOne(findJson).then((record) => {
            if (record) {
              return Promise.reject();
            } else {
              return Promise.resolve();
            }
          });
        } else {
          return true;
        }
      })
      .withMessage("This slug is already exists in this language")
      .run(req);
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

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

export default cmsValidator;
