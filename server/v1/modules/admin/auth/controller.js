import mongoose from "mongoose";
import bcrypt from "bcrypt";
import moment from "moment";
import jwt from "jsonwebtoken";
import randomstring from "randomstring";
import global from "../../../../../helpers/global-functions.js";
import User from "../../../../../models/users.js";
import { USER_ROLES, ACTIVE, JWT_CONFIG, ADMIN_OTP_DIGITS, MAIL_DEFAULT_SHORT_CODES, OTP_EXPIRE_LIMIT } from "../../../../../global-variable.js";

const authController = {
  login: (req, res) => {
    const { email, password } = req.body;
    const findJson = {
      email: email.trim().toLowerCase(),
      role: {
        $in: [USER_ROLES.SUPER_ADMIN, USER_ROLES.SUB_ADMIN],
      },
    };
    User.findOne(findJson).then((user) => {
      if (user) {
        if (user.status == ACTIVE) {
          if (user.password) {
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) {
                return global.failResponse(res, err.message, {});
              } else {
                if (isMatch) {
                  const privateKey = global.getJwtSecret();
                  const signData = { _id: user._id };
                  let jwtToken = jwt.sign(signData, privateKey, {
                    expiresIn: JWT_CONFIG.expire_time,
                  });
                  user.token = jwtToken;
                  user
                    .save()
                    .then(async () => {
                      return global.successResponse(res, global.msg(req, res, "msg_login_success"), await global.getUserData(user._id));
                    })
                    .catch((err) => {
                      return global.failResponse(res, err.message, err);
                    });
                } else {
                  return global.failResponse(res, global.msg(req, res, "msg_invalid_password"), {});
                }
              }
            });
          } else {
            return global.failResponse(res, global.msg(req, res, "msg_user_did_not_set_password_yet"), {});
          }
        } else {
          return global.failResponse(res, global.msg(req, res, "msg_user_account_is_blocked_by_admin"), {});
        }
      } else {
        return global.failResponse(res, global.msg(req, res, "msg_user_not_found"), {});
      }
    });
  } /** Ends function */,

  /**For forgot password*/
  forgetPassword: (req, res) => {
    const findJson = { email: req.body.email.trim().toLowerCase() };
    User.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "msg_user_not_registered"));
      } else if (user) {
        const otp = global.getOtp(ADMIN_OTP_DIGITS);
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
                global.successResponse(res, global.msg(req, res, "msg_otp_sent_success"), mailData);
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
    const findJson = { email: email.trim().toLowerCase() };
    User.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "msg_user_not_registered"));
      } else if (user) {
        const otp = global.getOtp(ADMIN_OTP_DIGITS);
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

  invitationInfo: (req, res) => {
    const { validate_string } = req.body;
    const findJson = { validate_string: validate_string };
    User.findOne(findJson).then((user) => {
      if (user) {
        let response = {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
        };
        return global.successResponse(res, global.msg(req, res, "msg_otp_sent_success"), response);
      } else {
        return global.failResponse(res, global.msg(req, res, "msg_link_expired"));
      }
    });
  } /** Ends invitationInfo */,

  completeInvitation: (req, res) => {
    const { validate_string, password } = req.body;
    const findJson = { validate_string: validate_string };
    User.findOne(findJson).then(async (user) => {
      if (user) {
        user.email_verified = ACTIVE;
        user.status = ACTIVE;
        user.validate_string = null;
        user.invitation_pending = false;
        user.new_email = null;
        user.password = await global.incPassword(password);
        user.save().then(() => {
          return global.successResponse(res, global.msg(req, res, "msg_profile_completed"));
        });
      } else {
        return global.failResponse(res, global.msg(req, res, "msg_link_expired"));
      }
    });
  } /** Ends invitationInfo */,

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

export default authController;
