import mongoose from "mongoose";
import bcrypt from "bcrypt";
import moment from "moment";
import jwt from "jsonwebtoken";
import randomstring from "randomstring";
import global from "../../../../../helpers/global-functions.js"

/** Models */
import User from "../../../../../models/users.js"


const routeController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const findJson = {
        email: email.trim().toLowerCase(),
        role: {
          $in: [USER_ROLES.RESTAURANT],
        },
      };

      const user = await User.findOne(findJson);

      if (!user) {
        return global.failResponse(res, global.msg(req, res, "msg_user_not_found"), {});
      }

      if (user.status !== ACTIVE) {
        return global.failResponse(res, global.msg(req, res, "msg_user_account_is_blocked_by_admin"), {});
      }

      if (!user.password) {
        return global.failResponse(res, global.msg(req, res, "msg_user_did_not_set_password_yet"), {});
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return global.failResponse(res, global.msg(req, res, "msg_invalid_password"), {});
      }

      const privateKey = global.getJwtSecret();
      const signData = { _id: user._id };
      const jwtToken = jwt.sign(signData, privateKey, {
        expiresIn: JWT_CONFIG.expire_time,
      });

      user.token = jwtToken;
      await user.save();

      return global.successResponse(res, global.msg(req, res, "msg_login_success"), await global.getUserData(user._id));
    } catch (err) {
      return global.failResponse(res, err.message, {});
    }
  },

  /**For forgot password*/
  forgetPassword: (req, res) => {
    /**const {email} = req.email;*/
    const findJson = {
      email: req.body.email.trim().toLowerCase(),
      role: {
        $in: [USER_ROLES.RESTAURANT],
      },
    };
    User.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "msg_user_not_registered"));
      } else if (user) {
        const otp = global.getOtp(4);
        user.otp = otp;
        user.otp_expire = new Date();
        await user.save();
        let options = {
          slug: "password_reset",
          dynamicStrings: {
            ...(await global.getUserDynamicStrings({
              _id: user._id,
            })),
          },
        };
        global
          .attachEmailTemplate(options)
          .then((template) => {
            global
              .sendEmail(template.subject, user.email, template.body, {
                name: user.name,
                email_slug: options.slug,
              })
              .then((mailData) => {
                global.successResponse(res, global.msg(req, res, "msg_otp_sent_success"), {});
              })
              .catch((mailErr) => {
                global.failResponse(res, global.msg(req, res, "err_email_not_send"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
      }
    });
  } /** Ends forgetPassword */,

  /**For fverify otp*/
  verifyOtp: (req, res) => {
    const { email, otp, type } = req.body;
    let findJson = {
      email: email.trim().toLowerCase(),
      otp: otp,
      role: {
        $in: [USER_ROLES.RESTAURANT],
      },
    };
    User.findOne(findJson)
      .then((user) => {
        if (user) {
          const now = moment(new Date());
          const end = moment(user.otp_expire);
          const duration = moment.duration(now.diff(end));
          const diff = duration.asMinutes();
          if (diff <= OTP_EXPIRE_LIMIT) {
            if (type == "password_reset") {
              const validateString = randomstring.generate({
                length: 16,
              });
              user.validate_string = validateString;
              user.save().then(() => {
                let responseData = {
                  validate_string: validateString,
                  type,
                };
                return global.successResponse(res, global.msg(req, res, "msg_otp_verified"), responseData);
              });
            }
          } else {
            return global.failResponse(res, global.msg(req, res, "msg_otp_expired"));
          }
        } else {
          return global.failResponse(res, global.msg(req, res, "msg_otp_not_match"));
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  } /** Ends verifyOtp */,

  /**For forgot password*/
  resendOtp: (req, res) => {
    const { email, type } = req.body;
    const findJson = {
      email: email.trim().toLowerCase(),
      role: {
        $in: [USER_ROLES.RESTAURANT],
      },
    };
    User.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "msg_user_not_registered"));
      } else if (user) {
        const otp = global.getOtp(4);
        user.otp = otp;
        user.otp_expire = new Date();
        await user.save();
        let options = {
          slug: type,
          dynamicStrings: {
            ...(await global.getUserDynamicStrings({
              _id: user._id,
            })),
          },
        };
        global
          .attachEmailTemplate(options)
          .then((template) => {
            global
              .sendEmail(template.subject, user.email, template.body, {
                name: user.name,
                email_slug: options.slug,
              })
              .then((mailData) => {
                return global.successResponse(res, global.msg(req, res, "msg_otp_sent_success"), {});
              })
              .catch((mailErr) => {
                return global.failResponse(res, global.msg(req, res, "err_email_not_send"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
      }
    });
  } /** Ends resendOtp */,

  resetPassword: (req, res) => {
    const { new_password, validate_string } = req.body;
    const findJson = { validate_string: validate_string };
    User.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "msg_you_are_not_authorized_to_reset_password"));
      } else if (user) {
        const newPasswordHash = await global.incPassword(new_password);
        user.password = newPasswordHash;
        await user.save();
        let options = {
          slug: "admin_password_changed",
          dynamicStrings: {
            new_password: new_password,
            ...(await global.getUserDynamicStrings({
              _id: user._id,
            })),
          },
        };
        global
          .attachEmailTemplate(options)
          .then((template) => {
            global
              .sendEmail(template.subject, user.email, template.body, {
                name: user.name,
                email_slug: options.slug,
              })
              .then((mailData) => {
                global.successResponse(res, global.msg(req, res, "msg_password_changed_successfully"), {});
              })
              .catch((mailErr) => {
                global.failResponse(res, global.msg(req, res, "err_email_not_send"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
      }
    });
  } /** Ends resetPassword */,
};

export default routeController;