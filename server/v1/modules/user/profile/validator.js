import global from "../../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../../global-variable.js";
import { body, validationResult, query } from "express-validator/lib/index.js";
import UserModel from "../../../../../models/users.js";
import { PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;




const authValidator = {


  editProfile: async (req, res, next) => {
    await global.validateTextField(
      req,
      "first_name",
      {},
      {
        required: global.msg(req, res, "user_err_first_name_is_required"),
      },

      "last_name",
      {},
      {
        required: global.msg(req, res, "user_err_last_name_is_required"),
      },

      "full_name",
      {},
      {
        required: global.msg(req, res, "user_err_full_name_is_requires"),
      },

      "username",
      {},
      {
        required: global.msg(req, res, "user_err_username_is_requires"),
      },

      // "DOB",
      // {},
      // {
      //   required: global.msg(req, res, "ser_err_DOB_is_requires"),
      // },

      "address",
      {},
      {
        required: global.msg(req, res, "user_err_address_is_required"),
      },

      "gender",
      {},
      {
        required: global.msg(req, res, "user_err_gender_is_requires"),
      }
    );

    // Validate phone_number and countryCode
    // await global.validateMobileNumberField(
    //   req,
    //   "phone_number",
    //   { required: true },
    //   {
    //     required: global.msg(req, res, "user_err_phone_number_is_required") || "Phone number is required",
    //   }
    // );

    // await global.validateTextField(
    //   req,
    //   "countryCode",
    //   {},
    //   {
    //     required: global.msg(req, res, "user_err_countryCode_is_required") || "Country code is required",
    //   }
    // );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    }
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },
  saveProfile: async (req, res, next) => {
    await global.validateTextField(
      req,
      "first_name",
      {},
      {
        required: global.msg(req, res, "user_err_first_name_is_required"),
      },

      "last_name",
      {},
      {
        required: global.msg(req, res, "user_err_last_name_is_required"),
      },

      "full_name",
      {},
      {
        required: global.msg(req, res, "user_err_full_name_is_required"),
      },

      "username",
      {},
      {
        required: global.msg(req, res, "user_err_username_is_required"),
      },

      // "DOB",
      // {},
      // {
      //   required: global.msg(req, res, "user_err_DOB_is_required"),
      // },

      "address",
      {},
      {
        required: global.msg(req, res, "user_err_address_is_required"),
      },

      "gender",
      {},
      {
        required: global.msg(req, res, "user_err_gender_is_required"),
      }
    );

    // Validate phone_number and countryCode
    // await global.validateMobileNumberField(
    //   req,
    //   "phone_number",
    //   { required: true },
    //   {
    //     required: global.msg(req, res, "user_err_phone_number_is_required") || "Phone number is required",
    //   }
    // );

    // await global.validateTextField(
    //   req,
    //   "countryCode",
    //   {},
    //   {
    //     required: global.msg(req, res, "user_err_countryCode_is_required") || "Country code is required",
    //   }
    // );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    }
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

  userDetails: async (req, res, next) => {
    await global.validateObjId(req, "_id", {
      findInDb: true,
      DBField: "_id",
      DB: UserModel,
      query: true,
    });
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  changePassword: async (req, res, next) => {
    const { new_password } = req.body;
    const { _id } = req.user;
    const findJson = { _id: new ObjectId(_id) };
    await body("current_password").custom(async (value, { req }) => {
      return new Promise((resolve, reject) => {
        UserModel.findOne(findJson).then((userDetail) => {
          bcrypt.compare(value, userDetail.password).then(async (passwordMatch) => {
            console.log("passwordMatch", passwordMatch)
            if (!passwordMatch) {
              reject(global.msg(req, res, 'msg_current_password_not_match'))
            }
            resolve()
          })
        })
      })

    }).run(req);

    await global.validatePasswordField(req, 'new_password', { required: true, findInDb: true, DBField: 'password', DB: UserModel, findJson: { _id: new ObjectId(_id) } },
      {
        required: global.msg(req, res, 'admin_err_new_password_is_required'),
        capital_letter: global.msg(req, res, 'err_capital_letter_in_password'),
        number: global.msg(req, res, 'err_one_number_in_password'),
        special_character: global.msg(req, res, 'err_one_special_char_in_password'),
        min_length: global.msg(req, res, 'err_min_length_password', [PASSWORD_MIN_LENGTH]),
        same_as_old: global.msg(req, res, 'err_password_cannot_be_same_as_old'),
      });

    await global.validateTextField(req, "confirm_newpassword");
    await body('confirm_newpassword').custom((value) => {
      if (new_password != value) {
        return false;
      }
      return true;
    }).withMessage(global.msg(req, res, 'err_password_do_not_match')).run(req);

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, global.msg(req, res, 'msg_invalid_request'), errors);
    }
  },
};

export default authValidator