import global from "../../../../../helpers/global-functions.js"
import bcrypt from "bcrypt"
import { body, validationResult, query, param } from "express-validator";
import mongoose from "mongoose"

const ObjectId = mongoose.Types.ObjectId;

/** Models */
import User from "../../../../../models/users.js";

const routeValidator = {
  editUser: async (req, res, next) => {
    await global.validateMobileNumberField(req, "phone_number", global.msgByReq(req, "admin_err_phone_no_is_required"));

    await global.validateTextField(req, "address", global.msgByReq(req, "admin_err_address_is_required"));

    await global.validateTextField(req, "first_name", global.msgByReq(req, "admin_err_first_name_is_required"));

    await global.validateTextField(req, "last_name", global.msgByReq(req, "admin_err_last_name_is_required"));

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  updatePassword: async (req, res, next) => {
    await body("current_password").not().isEmpty().withMessage(global.msg(req, res, "admin_err_password_is_required"));
    await body("new_password")
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage(global.msg(req, res, "admin_err_new_password_is_required"))
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(global.msg(req, res, "err_min_length_password").replace("{PASSWORD_MIN_LENGTH}", PASSWORD_MIN_LENGTH))
      .matches(/[A-Z]/)
      .withMessage(global.msg(req, res, "err_capital_letter_in_password"))
      .matches(/\d/)
      .withMessage(global.msg(req, res, "err_one_number_in_password"))
      .matches(/[@$!%*?&]/)
      .withMessage(global.msg(req, res, "err_one_special_char_in_password"))
      .custom(async (value, { req }) => {
        const user = await User.findOne({ _id: req.user._id });
        if (user) {
          const isSameAsOldPassword = await bcrypt.compare(value, user.password);
          if (isSameAsOldPassword) {
            throw new Error(global.msg(req, res, "err_password_cannot_be_same_as_old"));
          }
        } else {
          throw new Error(global.msg(req, res, "admin_err_validate_string_is_required"));
        }
      })
      .run(req);
    await body("confirm_newpassword")
      .not()
      .isEmpty()
      .withMessage(global.msg(req, res, "admin_err_c_password_is_required"))
      .custom((value) => {
        return req.body.new_password === req.body.confirm_newpassword;
      })
      .withMessage(global.msg(req, res, "admin_err_c_new_is_required"))
      .run(req);

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default routeValidator;