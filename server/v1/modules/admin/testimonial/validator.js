const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";

/** Models */
import User from "../../../../../models/users.js";
import Testimonials from "../../../../../models/testimonials.js";

const testimonialValidator = {
  save: async (req, res, next) => {
    await global.validateTextField(req, "name", global.msgByReq(req, "admin_err_name_is_required"));
    await global.validateTextField(req, "address", global.msgByReq(req, "admin_err_address_is_required"));
    await global.validateTextField(req, "city", global.msgByReq(req, "msg_city_required"));
    await global.validateTextField(req, "country", global.msgByReq(req, "msg_country_required"));
    await global.validateTextField(req, "testimonial_text", global.msgByReq(req, "testimonial_text_error"));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  editUser: async (req, res, next) => {
    await global.validateObjId(req, "o_id");
    await global.validateTextField(req, "name", global.msgByReq(req, "admin_err_name_is_required"));
    await global.validateTextField(req, "address", global.msgByReq(req, "admin_err_address_is_required"));
    await global.validateTextField(req, "city", global.msgByReq(req, "msg_city_required"));
    await global.validateTextField(req, "country", global.msgByReq(req, "msg_country_required"));
    await global.validateTextField(req, "testimonial_text", global.msgByReq(req, "testimonial_text_error"));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  editProfile: async (req, res, next) => {
    const { _id } = req.user;
    let profileRequiredFields = await global.getRequiredProfileFields();

    await global.validateEmailField(
      req,
      "email",
      {
        required: true,
        findInDb: true,
        DBField: "email",
        DB: User,
        findJson: { _id: { $ne: new ObjectId(_id) } },
      },
      {}
    );
    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  } /** Ends function */,

  // This function is used for change password validation
  changePassword: async (req, res, next) => {
    const { new_password } = req.body;
    const { _id } = req.user;
    await global.validateTextField(req, "current_password");
    await global.validatePasswordField(
      req,
      "new_password",
      {
        required: true,
        findInDb: true,
        DBField: "password",
        DB: User,
        findJson: {
          _id: new ObjectId(_id),
        },
      },
      {
        required: "admin_err_new_password_is_required",
        capital_letter: "err_capital_letter_in_password",
        number: "err_one_number_in_password",
        special_character: "err_one_special_char_in_password",
        min_length: "err_min_length_password".replace("{PASSWORD_MIN_LENGTH}", PASSWORD_MIN_LENGTH),
        same_as_old: "err_password_cannot_be_same_as_old",
      }
    );
    await global.validateTextField(req, "confirm_newpassword");
    await body("confirm_newpassword")
      .custom((value) => {
        if (new_password != value) {
          return false;
        }
        return true;
      })
      .withMessage("New password and confirm new password does not match")
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
    await global.validateObjId(req, "o_id", {
      findInDb: true,
      DBField: "_id",
      DB: Testimonials,
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
  // changeStatus: async (req, res, next) => {
  //     await global.validateObjId(req,'o_id', {findInDb:true, DBField:"_id", DB:User});
  //     await global.validateStatusField(req, 'status');

  //     let errors = validationResult(req).array({ onlyFirstError: true });
  //     if (errors.length == 0) {
  //         next();
  //     } else {
  //         return global.failResponse(res,MESSAGE.INVALID_REQUEST, errors);
  //     }
  // },

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

  assignMedia: async (req, res, next) => {
    await global.validateObjId(req, "o_id", {
      findInDb: true,
      DBField: "_id",
      DB: User,
    });
    await body("media")
      .trim()
      .not()
      .isEmpty()
      .withMessage("admin_assign_media_required")
      .custom((value) => {
        return new Promise((resolve, reject) => {
          try {
            let json = JSON.parse(value);
            if (Array.isArray(json)) {
              resolve();
            } else {
              return reject("Invalid json");
            }
          } catch (err) {
            return reject("Invalid json");
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

  chatList: async (req, res, next) => {
    await global.validateObjId(req, "user_id", {
      findInDb: true,
      DBField: "_id",
      DB: User,
    });
    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default testimonialValidator;
