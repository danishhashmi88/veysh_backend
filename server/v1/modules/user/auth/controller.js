import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import global from "../../../../../helpers/global-functions.js";
import UserModel from "../../../../../models/users.js";
import { USER_ROLES, ACTIVE, JWT_CONFIG, MESSAGE, PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";
import { OAuth2Client } from "google-auth-library";
const ObjectId = mongoose.Types.ObjectId;
import crypto from "crypto";
import { UPLOAD_FILE_PATH } from "../../../../../global-variable.js";
import subscriptionHelper from "../../../../../helpers/subscription-helper.js";
// const randomstring = require("randomstring");
import randomstring from "randomstring";

const authController = {
  signUpWithEmail: async (req, res) => {
    try {
      const { email, password, privacy_accepted, terms_accepted, role, fcm_token } = req.body;
      console.log("[FCM] Token received in signUpWithEmail:", fcm_token);

      // Validate role
      const validRoles = [USER_ROLES.USER, USER_ROLES.STYLIST];
      const userRole = role && validRoles.includes(role) ? role : USER_ROLES.USER;

      // Check if email already exists with any role (user or stylist)
      const findEmail = {
        email: email.trim().toLowerCase(),
        role: { $in: [USER_ROLES.USER, USER_ROLES.STYLIST] },
      };

      const existingUser = await UserModel.findOne(findEmail);
      if (existingUser) {
        return global.failResponse(res, global.msg(req, res, "err_already_email_list"), {});
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const newUser = new UserModel({
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: userRole,
        is_email_verified: false,
        privacy_accepted,
        terms_accepted,
        otp,
        otp_expire: otpExpiresAt,
        accountProvider: "email",
        fcm_token: fcm_token,
      });

      const savedUser = await newUser.save();

      let options = {
        slug: "register",
        dynamicStrings: {
          ...(await global.getUserDynamicStrings({ _id: savedUser._id })),
        },
      };

      global
        .attachEmailTemplate(options)
        .then((template) => {
          global
            .sendEmail(template.subject, savedUser.email, template.body, {
              name: savedUser.name,
              email_slug: options.slug,
            })
            .then((mailData) => {
              const userResponse = {
                id: savedUser._id,
                email: savedUser.email,
                role: savedUser.role,
                is_email_verified: false,
              };
              global.successResponse(res, global.msg(req, res, "User created successfully"), userResponse);
            })
            .catch((mailErr) => {
              global.failResponse(res, global.msg(req, res, "msg_something_went_wrong"), mailErr);
            });
        })
        .catch((err) => {
          return global.failResponse(res, err.message, err);
        });
    } catch (error) {
      return global.failResponse(res, global.msg(req, res, "Internal server error"), {});
    }
  },

  verifyOtpWithEmail: async (req, res) => {
    try {
      const { email, otp, type, role } = req.body;

      // Validate role
      const validRoles = [USER_ROLES.USER, USER_ROLES.STYLIST];
      const userRole = role && validRoles.includes(role) ? role : USER_ROLES.USER;

      // Find user with same email and same role
      const user = await UserModel.findOne({
        email: email.trim().toLowerCase(),
        role: userRole,
      });

      if (!user) {
        return global.failResponse(res, global.msg(req, res, "User not found"), {});
      }

      if (!user.otp || user.otp !== otp.trim()) {
        return global.failResponse(res, global.msg(req, res, "Invalid OTP"), {});
      }

      if (user.otp_expire && new Date() > user.otp_expire) {
        return global.failResponse(res, global.msg(req, res, "OTP expired"), {});
      }

      if (type === "password_reset") {
        const validateString = randomstring.generate({ length: 16 });
        // user.validate_string = validateString;

        // await user.save();
        await UserModel.findByIdAndUpdate(user._id, {
          $set: {
            otp: null,
            otp_expire: null,
            validate_string: validateString
          }
        });

        let responseData = {
          validate_string: validateString,
          type,
        };
        return global.successResponse(res, global.msg(req, res, "OTP verified successfully"), responseData);
      } else if (type === "register") {
        // user.is_email_verified = true;

        const privateKey = global.getJwtSecret();
        const signData = { _id: user._id };
        let jwtToken = jwt.sign(signData, privateKey, { expiresIn: JWT_CONFIG.expire_time });
        // user.token = jwtToken;

        // await user.save();
        await UserModel.findByIdAndUpdate(user._id, {
          $set: {
            otp: null,
            otp_expire: null,
            is_email_verified: true,
            token: jwtToken
          }
        });

        // Assign Basic Subscription
        await subscriptionHelper.assignBasicSubscription(user._id);

        return global.successResponse(res, global.msg(req, res, "OTP verified successfully"), await global.getUserData(user._id));
      } else {
        return global.failResponse(res, global.msg(req, res, "Invalid type"), {});
      }
    } catch (error) {
      console.error("verifyOtpWithEmail Error:", error);
      return global.failResponse(res, error.message || "Internal server error", {});
    }
  },

  login: async (req, res) => {
    try {
      const { email, password, fcm_token } = req.body;

      const findJson = {
        email: email.trim().toLowerCase(),
        role: {
          $in: [USER_ROLES.USER, USER_ROLES.STYLIST],
        },
      };

      const user = await UserModel.findOne(findJson);

      if (!user) {
        return global.failResponse(res, global.msg(req, res, "msg_user_not_found"), {});
      }

      if (user.status !== ACTIVE) {
        return global.failResponse(res, global.msg(req, res, "msg_user_account_is_blocked_by_admin"), {});
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return global.failResponse(res, global.msg(req, res, "msg_invalid_password"), {});
      }

      if (user.is_email_verified !== true) {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // user.otp = otp;
        // user.otp_expire = otpExpiresAt;
        // user.fcm_token = fcm_token;
        // await user.save();
        await UserModel.findByIdAndUpdate(user._id, {
          $set: {
            otp: otp,
            otp_expire: otpExpiresAt,
            fcm_token: fcm_token
          }
        });

        let options = {
          slug: "register",
          dynamicStrings: {
            ...(await global.getUserDynamicStrings({ _id: user._id })),
          },
        };

        // const userData = await global.getUserData(user._id);
        // userData.profile_slugs = user.profile_slugs;

        global
          .attachEmailTemplate(options)
          .then((template) => {
            global
              .sendEmail(template.subject, user.email, template.body, {
                name: user.name,
                email_slug: options.slug,
              })
              .then((mailData) => {
                // global.failResponse(res, global.msg(req, res, "msg_user_email_is_not_verified_yet_otp_sent"), { is_email_verified: user.is_email_verified });
                global.failResponse(
                  res,
                  "Email is not verified. A new OTP has been sent to your email.",
                  {
                    is_email_verified: false
                  },
                  200
                );
              })
              .catch((mailErr) => {
                global.failResponse(res, global.msg(req, res, "msg_something_went_wrong"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
        return;
      }

      const privateKey = global.getJwtSecret();
      const signData = { _id: user._id };
      const jwtToken = jwt.sign(signData, privateKey, {
        expiresIn: JWT_CONFIG.expire_time,
      });

      // user.token = jwtToken;
      // await user.save();
      await UserModel.findByIdAndUpdate(user._id, {
        $set: { token: jwtToken }
      });
      const userData = await global.getUserData(user._id);

      userData.profile_slugs = user.profile_slugs;


      return global.successResponse(res, global.msg(req, res, "msg_login_success"), { user_data: userData });
    } catch (err) {
      return global.failResponse(res, err.message, {});
    }
  },
  forgetPassword: (req, res) => {
    const findJson = { email: req.body.email.trim().toLowerCase() };
    UserModel.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "err_user_not_found"));
      } else if (user) {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otp_expire = otpExpiresAt;
        await user.save();
        let options = {
          slug: "password_reset",
          dynamicStrings: {
            ...(await global.getUserDynamicStrings({ _id: user._id })),
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
                global.failResponse(res, global.msg(req, res, "msg_something_went_wrong"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
      }
    });
  },
  resendOtp: (req, res) => {
    const { email, type } = req.body;
    const findJson = { email: email };
    UserModel.findOne(findJson).then(async (user) => {
      if (!user) {
        global.failResponse(res, global.msg(req, res, "msg_user_not_found"));
      } else if (user) {
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otp_expire = otpExpiresAt;
        await user.save();
        let options = {
          slug: type,
          dynamicStrings: {
            ...(await global.getUserDynamicStrings({ _id: user._id })),
          },
        };
        global
          .attachEmailTemplate(options)
          .then((template) => {
            global
              .sendEmail(template.subject, type == "update_email" ? user.new_email : user.email, template.body, {
                name: user.name,
                email_slug: options.slug,
              })
              .then((mailData) => {
                return global.successResponse(res, global.msg(req, res, "msg_otp_sent_success"), {});
              })
              .catch((mailErr) => {
                return global.failResponse(res, global.msg(req, res, "msg_something_went_wrong"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
      }
    });
  },
  resetPassword: (req, res) => {
    const { new_password, validate_string } = req.body;
    const findJson = { validate_string: validate_string };
    UserModel.findOne(findJson).then(async (user) => {
      if (!user) {
        return global.failResponse(res, global.msg(req, res, "msg_you_are_not_authorized_to_reset_password"));
      } else if (user) {
        const newPasswordHash = await global.incPassword(new_password);
        user.password = newPasswordHash;
        user.validate_string = null;
        await user.save();
        let options = {
          slug: "admin_password_changed",
          dynamicStrings: {
            new_password: new_password,
            ...(await global.getUserDynamicStrings({ _id: user._id })),
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
                return global.successResponse(res, global.msg(req, res, "msg_password_changed_successfully"), {});
              })
              .catch((mailErr) => {
                return global.failResponse(res, global.msg(req, res, "msg_something_went_wrong"), mailErr);
              });
          })
          .catch((err) => {
            return global.failResponse(res, err.message, err);
          });
      }
    });
  },

  googleLogin: async (req, res) => {
    try {
      const { id_token, fcm_token } = req.body;
      if (fcm_token) console.log("[FCM] Token received in googleLogin:", fcm_token);
      const { nanoid } = await import("nanoid");


      const client = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      });

      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return global.failResponse(res, "Invalid Google token", {});
      }

      const { email, name, picture, sub: googleId } = payload;
      const googleEmail = email.trim().toLowerCase();

      let user = await UserModel.findOne({
        email: googleEmail,
        role: { $in: [USER_ROLES.USER] },
      });

      if (user) {
        if (user.status !== ACTIVE) {
          return global.failResponse(res, global.msg(req, res, "msg_user_account_is_blocked_by_admin"), {});
        }
        if (!user.google_id) {
          user.google_id = googleId;
          user.is_email_verified = true;
        }

        if (!user.profile_image && picture) {
          user.profile_image = picture;
        }
      } else {
        user = new UserModel({
          _id: new ObjectId(),
          name: name,
          email: googleEmail,
          password: null,
          accountProvider: "google",
          profile_image: picture,
          google_id: googleId,
          is_email_verified: true,
          role: USER_ROLES.USER,
          status: ACTIVE,
        });
      }
      const privateKey = global.getJwtSecret();
      const signData = { _id: user._id };
      const jwtToken = jwt.sign(signData, privateKey, {
        expiresIn: JWT_CONFIG.expire_time,
      });

      // user.token = jwtToken;
      // await user.save();
      await UserModel.findByIdAndUpdate(user._id, {
        $set: {
          token: jwtToken,
          ...(user.isNew ? {} : {
            google_id: user.google_id || googleId,
            is_email_verified: true,
            profile_image: user.profile_image || picture
          })
        }
      });

      if (user.isNew) {
        await user.save();
        await subscriptionHelper.assignBasicSubscription(user._id);
      }

      const userData = await global.getUserData(user._id);

      return global.successResponse(res, global.msg(req, res, "Logged in successfully"), userData);
    } catch (err) {
      console.error("Google login error:", err);
      return global.failResponse(res, err.message, {});
    }
  },

  appleLogin: async (req, res) => {
    try {
      const { fcm_token } = req.body;
      if (fcm_token) console.log("[FCM] Token received in appleLogin:", fcm_token);
      const id_token = req.body.id_token || req.body.identityToken;

      if (!id_token || !String(id_token).trim()) {
        return global.failResponse(res, global.msg(req, res, "err_missing_token"), {});
      }

      const response = await global.verifyAppleToken(id_token.trim());

      const { sub: appleId, email, aud, iss } = response;

      const validIss = "https://appleid.apple.com";
      if (iss !== validIss || !appleId) {
        return global.failResponse(res, global.msg(req, res, "err_invalid_apple_token"), {});
      }
      const appId = process.env.APPLE_APP_ID;
      const isRealAppId = appId && !/your_apple|placeholder|example/i.test(String(appId));
      if (isRealAppId && aud !== appId) {
        return global.failResponse(res, global.msg(req, res, "err_invalid_apple_token"), {});
      }

      const appleEmail = email ? email.trim().toLowerCase() : null;

      let user = await UserModel.findOne({
        $or: [{ apple_id: appleId }, ...(appleEmail ? [{ email: appleEmail }] : [])],
        role: { $in: [USER_ROLES.USER, USER_ROLES.STYLIST] },
      });

      if (user) {
        if (user.status !== ACTIVE) {
          return global.failResponse(res, global.msg(req, res, "msg_user_account_is_blocked_by_admin"), {});
        }
        user.apple_id = appleId;
        if (appleEmail) user.email = appleEmail;
      } else {
        if (!appleEmail) {
          return global.failResponse(res, "Email required for new Apple sign-in", {});
        }
        const userName = appleEmail.split("@")[0] || "User";

        user = new UserModel({
          _id: new ObjectId(),
          email: appleEmail,
          name: userName,
          password: null,
          apple_id: appleId,
          accountProvider: "apple",
          role: USER_ROLES.USER,
          status: ACTIVE,
          is_email_verified: true,
        });
      }

      const privateKey = global.getJwtSecret();
      const signData = { _id: user._id };
      const token = jwt.sign(signData, privateKey, {
        expiresIn: JWT_CONFIG.expire_time,
      });

      // user.token = token;
      // await user.save();
      await UserModel.findByIdAndUpdate(user._id, {
        $set: {
          token: token,
          ...(user.isNew ? {} : {
            apple_id: appleId,
            email: appleEmail || user.email
          })
        }
      });

      if (user.isNew) {
        await user.save();
        await subscriptionHelper.assignBasicSubscription(user._id);
      }

      const userData = await global.getUserData(user._id);
      if (userData && !userData.token) userData.token = token;

      return global.successResponse(res, global.msg(req, res, "Login successful"), userData || { ...user.toObject(), token });
    } catch (err) {
      console.error("Apple Sign-In Error:", err);
      const msg = global.msg(req, res, "err_social_login_failed");
      return global.failResponse(res, msg, process.env.PRODUCTION === "true" ? {} : { detail: err.message });
    }
  },

  saveProfile: async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        full_name,
        username,
        DOB,
        address,
        gender,
        stylist_referral_link,
        goals,
        preferred_colors,
        brands,
        sizes,
        measurements,
        dislikes,
        body_type,
        hair_color,
        hair_type,
        eye_color,
        face_shape,
        complexion,
        style_desc,
        style,
        mood_board,
        pinterest_link,
        sustain_preferences,
        assign_task,
        closetPrivacy,
      } = req.body;

      const _id = req.user._id;

      if (!ObjectId.isValid(_id)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (username) {
        const userWithSameUsername = await UserModel.findOne({ username });
        if (userWithSameUsername && userWithSameUsername._id.toString() !== _id) {
          return global.failResponse(res, "Username already taken", {});
        }
      }

      let updateData = {};

      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (first_name && last_name) {
        updateData.full_name = first_name + " " + last_name;
      }
      if (username !== undefined) updateData.username = username;
      if (DOB !== undefined) updateData.DOB = DOB;
      if (address !== undefined) updateData.address = address;
      if (gender !== undefined) updateData.gender = gender;
      if (stylist_referral_link !== undefined) updateData.stylist_referral_link = stylist_referral_link;

      if (goals !== undefined) {
        updateData.goals = typeof goals === "string" ? JSON.parse(goals) : goals;
      }
      if (preferred_colors !== undefined) {
        updateData.preferred_colors = typeof preferred_colors === "string" ? JSON.parse(preferred_colors) : preferred_colors;
      }
      if (brands !== undefined) {
        updateData.brands = typeof brands === "string" ? JSON.parse(brands) : brands;
      }
      if (dislikes !== undefined) updateData.dislikes = dislikes;

      if (sizes !== undefined) {
        updateData.sizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      }
      if (measurements !== undefined) {
        updateData.measurements = typeof measurements === "string" ? JSON.parse(measurements) : measurements;
      }
      if (body_type !== undefined) updateData.body_type = body_type;
      if (hair_color !== undefined) updateData.hair_color = hair_color;
      if (hair_type !== undefined) updateData.hair_type = hair_type;
      if (eye_color !== undefined) updateData.eye_color = eye_color;
      if (face_shape !== undefined) updateData.face_shape = face_shape;
      if (complexion !== undefined) updateData.complexion = complexion;
      if (style_desc !== undefined) updateData.style_desc = style_desc;
      if (style !== undefined) updateData.style = style;
      if (mood_board !== undefined) updateData.mood_board = mood_board;
      if (pinterest_link !== undefined) updateData.pinterest_link = pinterest_link;
      if (sustain_preferences !== undefined) updateData.sustain_preferences = sustain_preferences;
      if (assign_task !== undefined) updateData.assign_task = assign_task;

      const imageName = await global.uploadFile(req, "profile_image", "users");
      if (imageName) {
        updateData.profile_image = imageName;
      }
      const fullBodyImages = await global.uploadFile(req, "full_body_image", "users");

      if (fullBodyImages) {
        updateData.full_body_image = fullBodyImages;
      }

      if (closetPrivacy !== undefined) {
        updateData.closetPrivacy = closetPrivacy;
      }

      const updateUser = await UserModel.findByIdAndUpdate(_id, updateData, {
        new: true,
        upsert: true,
        overwrite: true,
        runValidators: true,
      }).select("-password");

      if (!updateUser) {
        return global.failResponse(res, "User not found", {});
      }
      return global.successResponse(res, global.msgByReq(req, "profile_updated"), { user: updateUser });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  userDetails: (req, res) => {
    const { _id } = req.query;
    const json = { _id: new ObjectId(_id) };
    UserModel.aggregate([
      { $match: json },
      global.userDataQuery("createdBy", "createdBy"),
      global.userDataQuery("updatedBy", "updatedBy"),
      {
        $project: {
          id: 1,
          full_name: 1,
          first_name: 1,
          last_name: 1,
          username: 1,
          countryCode: 1,
          phone_number: 1,
          DOB: 1,
          gender: 1,
          role: 1,
          email: 1,
          referral_link: 1,
          stylist_referral_link: 1,
          preferred_colors: 1,
          goals: 1,
          brands: 1,
          sizes: 1,
          measurement: 1,
          dislikes: 1,
          body_type: 1,
          hair_color: 1,
          hair_type: 1,
          eye_color: 1,
          face_shape: 1,
          complexion: 1,
          preferred_colors: 1,
          brands: 1,
          style_desc: 1,
          style: 1,
          mood_board: 1,
          sustain_preferences: 1,
          pinterest_link: 1,
          assign_task: 1,
          closetPrivacy: 1,
          full_body_image: 1,
          profile_image: 1,
          shirt_size: 1,
          trouser_size: 1,
          assign_task: 1,
          shoe_size: 1,
          wrist_size: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: { $arrayElemAt: ["$createdBy", 0] },
          updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
        },
      },
    ])
      .exec()
      .then(function (result) {
        if (result.length > 0) {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), result[0]);
        } else {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },
};

export default authController;
