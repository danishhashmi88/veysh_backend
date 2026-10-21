import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { removeBackground } from "@imgly/background-removal-node";
import https from "https";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import randomstring from "randomstring";
const ObjectId = mongoose.Types.ObjectId;
import slugify from "slugify";
import { body, query, param, validationResult } from "express-validator";
import enJSON from "../locales/en.json" with { type: "json" };
import jaJSON from "../locales/ja.json" with { type: "json" };
import ffmpeg from "fluent-ffmpeg";
import axios from "axios";
import FormData from 'form-data';
/**Modals*/

import UserModel from "../models/users.js";
import EmailTempModel from "../models/email-templates.js";
import GlobalSettingsModel from "../models/global-settings.js";
import MessagesModel from "../models/messages.js";
import {
  STATUS_SUCCESS,
  MESSAGE,
  PASSWORD_MIN_LENGTH,
  STATUS_UNAUTHORIZED,
  FILES_URL,
  DEFAULT_USER_PROFILE,
  JWT_CONFIG,
  ACTIVE,
  DE_ACTIVE,
  USER_ROLES,
  DEFAULT_SORTING,
  UPLOAD_FILE_PATH,
  MAIL_DEFAULT_SHORT_CODES,
  EMPTY_SHORT_CODE_VALUE,
  EMAIL_TEMPLATE_LAYOUT,
  BCRYPT_SALT_ROUNDS,
  SORT_A,
  SORT_D,
  MESSAGE_TYPES,
  NOTIFICATIONS_TYPES,
  MONTHS,
  DAYS,
} from "../global-variable.js";
import { assert, log } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configDir = path.join(__dirname, "../config");
const keyPath = path.join(configDir, "jwt-secret.key");

class GlobalFunctions {
  static successResponse(res, message = "", resp = {}, statuscode = STATUS_SUCCESS) {
    let response = {
      success: true,
      message: message,
      data: resp,
      error: null,
    };
    return res.status(statuscode).send(response);
  }
  static failResponse(res, message, error = {}, statuscode = STATUS_SUCCESS) {
    let response = {
      success: false,
      message: message,
      data: {},
      error: error,
    };
    return res.status(statuscode).send(response);
  }

  static failResponseValidator(res, message, error = {}, statuscode = STATUS_SUCCESS) {
    let response = {
      success: false,
      message: error[0].msg || message,
      data: {},
      error: error,
    };
    return res.status(statuscode).send(response);
  }

  /**For generate a secret key */
  static generatePrivateKey() {
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    let privateKeyPem = privateKey.export({ type: "pkcs1", format: "pem" });
    return privateKeyPem;
  }

  static getJwtSecret() {
    let privateKey = "";
    try {
      privateKey = fs.readFileSync(path.join(__dirname, "../config") + "/jwt-secret.key", "utf8");
      if (privateKey.length < 10) {
        privateKey = GlobalFunctions.generatePrivateKey();
        fs.writeFileSync(path.join(__dirname, "../config") + "/jwt-secret.key", privateKey);
      }
    } catch (err) {
      privateKey = GlobalFunctions.generatePrivateKey();
      fs.writeFileSync(keyPath, privateKey);
    }
    privateKey = privateKey.split("-----");
    return privateKey[2] ? privateKey[2] : privateKey[0];
  }

  /* For sending mail */
  // static sendEmail(
  //   subject,
  //   toEmail,
  //   content,
  //   otherInfo = {},
  //   attachments = []
  // ) {
  //   console.log(subject, toEmail, content);
  //   return new Promise(async (resolve, reject) => {
  //     if (content) {
  //       let settings = await GlobalFunctions.getGlobalSettings();
  //       console.log(settings, 'settings');
  //       let mailOptions = {
  //         from: `"Will Pos" <${process.env.SMTP_EMAIL}>`,
  //         subject: subject,
  //         ...(typeof toEmail == "string" ? { to: toEmail } : toEmail),
  //         html: content,
  //       };

  //       const transporter = nodemailer.createTransport({
  //         host: process.env.SMTP_HOST,
  //         secure: GlobalFunctions.getBoolean(process.env.SMTP_SECURE),
  //         port: process.env.SMTP_PORT,
  //         auth: {
  //           user: process.env.SMTP_EMAIL, //email",
  //           pass: process.env.SMTP_PASSWORD, //"****** "
  //         },
  //       });

  //       if (attachments.length) {
  //         mailOptions.attachments = attachments;
  //         // transporter.use('compile', attachments());
  //       }
  //       console.log('mailoptions', mailOptions)
  //       transporter.sendMail(mailOptions, function (error, info) {
  //         if (error) {
  //           console.log(
  //             "MAIL RESPONSE##",
  //             "Error=>",
  //             error,
  //             " Response=>",
  //             info
  //           );
  //           // reject(error);
  //         } else {
  //           console.log("Mail sent", info);
  //           // resolve(info);
  //         }
  //       });
  //       return resolve({});
  //     } else {
  //       return resolve({});
  //     }
  //   });
  // }
  static sendEmail(subject, toEmail, content) {
    return new Promise(async (resolve, reject) => {
      const mailOptions = {
        // from: process.env.SMTP_EMAIL,
        from: `"Online Closet" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: subject,
        html: content,
      };

      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE, //"gmail",
        host: process.env.SMTP_HOST, // hostname
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_EMAIL, //email",
          pass: process.env.SMTP_PASSWORD, //"****** "
        },
      });

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
        }
      });
      resolve({});
    });
  }

  static sendEmailWithReject(subject, toEmail, content) {
    return new Promise(async (resolve, reject) => {
      if (content) {
        let settings = await GlobalFunctions.getGlobalSettings();
        const mailOptions = {
          from: `"${settings.smtp_username}" <${process.env.SMTP_EMAIL}>`,
          ...(typeof toEmail == "string" ? { to: toEmail } : toEmail),
          subject: subject,
          html: content,
        };
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: GlobalFunctions.getBoolean(process.env.SMTP_SECURE),
          auth: {
            user: process.env.SMTP_EMAIL, //email",
            pass: process.env.SMTP_PASSWORD, //"****** "
          },
        });

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            reject(error);
          } else {
            resolve(info);
          }
        });
      } else {
        return resolve({});
      }
    });
  }

  /**  to remove files
   *    files : file name including file path
   *    files : this can be array of file paths or a single string of file path
   */
  static removeFiles(files) {
    return new Promise((resolve, reject) => {
      if (Array.isArray(files) && files.length > 0) {
        files.forEach((path) => {
          if (fs.existsSync(path)) {
            fs.unlink(path, (err) => {
              if (err) {
                reject(err);
              }
            });
          }
        });
        resolve(true);
      } else {
        let path = files; /**One file path only */
        if (fs.existsSync(path)) {
          fs.unlink(path, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(true);
            }
          });
        } else {
          resolve(true);
        }
      }
    });
  }

  /**  to create directory if directory is not exists */
  static createDir(path) {
    return new Promise((resolve) => {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
        resolve(true);
      } else {
        resolve(true);
      }
    });
  }

  /**  to create file if file is not exists */
  static createFile(path) {
    return new Promise((resolve) => {
      fs.exists(path, function (exists) {
        if (exists) {
          resolve();
        } else {
          fs.appendFile(path, "", function (err, data) {
            resolve();
          });
        }
      });
    });
  }

  /**  manage sorting */
  static getSorting(req) {
    return new Promise((resolve) => {
      let sorting = {};
      if (req && req.body && req.body.sort) {
        try {
          let json = req.body.sort;
          if (typeof json === "string" && (json.startsWith("{") || json.startsWith("["))) {
            json = JSON.parse(json);
          }

          if (
            json &&
            typeof json === "object" &&
            json.column &&
            json.order &&
            (json.order == SORT_A || json.order == SORT_D)
          ) {
            sorting[json.column] = Number(json.order);
            resolve(sorting);
          } else {
            resolve(DEFAULT_SORTING);
          }
        } catch (err) {
          console.log("Api => " + req.originalUrl, "Sorting Error**", err);
          resolve(DEFAULT_SORTING);
        }
      } else {
        resolve(DEFAULT_SORTING);
      }
    });
  }

  static getSorting2(req) {
    return new Promise((resolve) => {
      let sorting = {};

      if (req?.body?.sort) {
        try {
          const json = typeof req.body.sort === "string" ? JSON.parse(req.body.sort) : req.body.sort;

          const order = Number(json.order);

          if (json.column && (order === 1 || order === -1)) {
            const column = json.column === "price" ? "price_sort" : json.column;

            sorting[column] = order;
            return resolve(sorting);
          }
        } catch (err) { }
      }

      resolve(DEFAULT_SORTING);
    });
  }

  /**  manage common searching */
  static getFilter(req) {
    const { question_set_id, event_id } = req.body;
    let json = {};
    if (ObjectId.isValid(question_set_id)) {
      json.question_set_id = new ObjectId(question_set_id);
    }
    if (ObjectId.isValid(event_id)) {
      json.event_id = new ObjectId(event_id);
    }

    return json;
  }

  /**  manage searching */
  static getSearching(req, global_search = []) {
    let search = {};

    if (req.body.search) {
      try {
        let params;
        if (typeof req.body.search === "string") {
          params = JSON.parse(req.body.search);
        } else {
          params = req.body.search;
        }

        Object.keys(params).map((key) => {
          if (key == "status") {
            search[key] = params[key];
          } else if (key == "type") {
            search[key] = params[key];
          } else if (key == "gender") {
            search[key] = params[key];
          } else if (key === "category" && mongoose.Types.ObjectId.isValid(params[key])) {
            search[key] = new mongoose.Types.ObjectId(params[key]);
          } else if (["season", "care", "size", "occasion", "mood", "statuses"].includes(key)) {
            if (Array.isArray(params[key]) && params[key].length) {
              search[key] = { $in: params[key] };
            } else {
              search[key] = params[key];
            }
          } else if ((key === "colors" || key === "fabric") && Array.isArray(params[key]) && params[key].length) {
            search[key] = { $in: params[key] };
          } else if (key == "createdAt" && params[key].start && params[key].end) {
            /**setting start of the day */
            let start = new Date(params[key].start);
            start.setHours(0, 0, 0, 0);
            /**setting end of the day */
            let end = new Date(params[key].end);
            end.setHours(23, 59, 59, 999);
            search["$and"] = [{ createdAt: { $gte: start } }, { createdAt: { $lte: end } }];
          } else if (key === "price" && params[key].min !== undefined && params[key].max !== undefined) {
            search.price = {
              $gte: Number(params[key].min),

              $lte: Number(params[key].max),
            };
          } else if (typeof params[key] == "string") {
            search[key] = { $regex: params[key], $options: "i" };
          } else if (typeof params[key] == "number") {
            search[key] = params[key];
          } else if (typeof params[key] == "boolean") {
            search[key] = params[key];
          }
        });
      } catch (err) { }
    }

    if (req.body.global_search && global_search.length > 0) {
      try {
        let text = req.body.global_search.trim();
        let jsonArray = [];
        global_search.forEach((key) => {
          let obj = {};
          obj[key] = { $regex: text, $options: "i" };
          jsonArray.push(obj);
        });
        search["$or"] = jsonArray;
      } catch (err) { }
    }
    return search;
  }

  static attachEmailTemplate(options) {
    const slug = options.slug;
    const dynamicStrings = {
      ...MAIL_DEFAULT_SHORT_CODES,
      ...(options.dynamicStrings ? options.dynamicStrings : {}),
    };
    let mailData = {};

    return new Promise((resolve, reject) => {
      const findJson = { slug: slug, status: ACTIVE };

      EmailTempModel.findOne(findJson)
        .then((template) => {
          if (!template) {
            mailData.title = null;
            mailData.subject = null;
            mailData.body = null;

            return resolve(mailData);
          }

          let body = template.description;
          let allShortCodes = template.options && template.options.length ? template.options : [];
          allShortCodes.forEach((sortCode) => {
            const value = dynamicStrings[sortCode] ? dynamicStrings[sortCode] : EMPTY_SHORT_CODE_VALUE;
            body = body.replace(RegExp("{" + sortCode.toUpperCase() + "}", "g"), value);
          });

          body = EMAIL_TEMPLATE_LAYOUT.replace(RegExp("{{MESSAGE_BODY}}", "g"), body);

          mailData.title = template.title;
          mailData.subject = template.subject;
          mailData.body = body;
          resolve(mailData);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  static getGlobalSettings() {
    return new Promise((resolve, reject) => {
      GlobalSettingsModel.findOne({})
        .then((data) => {
          resolve(data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static async getRestId() {
    const settings = await GlobalFunctions.getGlobalSettings();
    let id = 100000;
    if (settings.last_rest_id) {
      id = settings.last_rest_id;
    }
    return id + 1;
  }

  static isLoggedIn(req, res, next) {
    GlobalFunctions.checkAuth(req, res, next)
      .then(() => {
        next();
      })
      .catch((err) => {
        return GlobalFunctions.failResponse(res, err, {}, STATUS_UNAUTHORIZED);
      });
  }
  static checkAuth(req, res, next) {
    return new Promise((resolve, reject) => {
      let token = "";
      if (req.headers.authorization) {
        let string = req.headers.authorization.split(" ");
        token = string[1];
      } else {
        token = false;
      }
      if (!token) {
        reject(GlobalFunctions.msg(req, res, "msg_err_token_not_exist"));
      }

      const privateKey = GlobalFunctions.getJwtSecret();

      jwt.verify(token, privateKey, { expiresIn: JWT_CONFIG.expire_time }, (err, decoded) => {
        if (err) {
          reject(GlobalFunctions.msg(req, res, "msg_err_session_expired"));
        } else {
          UserModel.aggregate([
            {
              $match: {
                _id: new ObjectId(decoded._id),
              },
            },
          ])
            .then((users) => {
              if (users && users.length > 0) {
                const user = users[0];
                if (user.status == ACTIVE) {
                  req.user = user;
                  resolve(user);
                } else {
                  reject(GlobalFunctions.msg(req, res, "msg_account_blocked"));
                }
              } else {
                reject(GlobalFunctions.msg(req, res, "msg_err_user_not_found"));
              }
            })
            .catch((err) => {
              reject(err.message);
            });
        }
      });
    });
  }

  static isSuperAdmin(req, res, next) {
    const user = req.user;
    if (user.role == USER_ROLES.SUPER_ADMIN) {
      next();
    } else {
      return res.status(STATUS_UNAUTHORIZED).send(GlobalFunctions.msg(req, res, "msg_only_superadmin_access"));
    }
  }
  static isAdmin(req, res, next) {
    const user = req.user;
    if (user.role == USER_ROLES.SUPER_ADMIN) {
      next();
    } else {
      return res.status(STATUS_UNAUTHORIZED).send(GlobalFunctions.msg(req, res, "msg_only_superadmin_access"));
    }
  }

  static isSubAdmin(req, res, next) {
    const user = req.user;
    if (user.role == USER_ROLES.SUB_ADMIN) {
      next();
    } else {
      return res.status(STATUS_UNAUTHORIZED).send(GlobalFunctions.msg(req, res, "msg_only_subadmin_access"));
    }
  }

  static isRestaurant(req, res, next) {
    const user = req.user;

    // Check if user is of role RESTAURANT
    if (user.role !== USER_ROLES.RESTAURANT) {
      return res.status(STATUS_UNAUTHORIZED).send(GlobalFunctions.msgByReq(req, "restaurant_authentication_error"));
    }

    // Check if user has enrollment details
    if (!user.enrollment_details || user.enrollment_details.length === 0) {
      return res.status(STATUS_UNAUTHORIZED).send(GlobalFunctions.msg(req, res, "msg_restaurant_not_enrolled"));
    }

    // Check expiry date
    const expiryDate = user.enrollment_details[0].expiry_date;
    const today = new Date();

    if (expiryDate && new Date(expiryDate) < today) {
      return res.status(STATUS_UNAUTHORIZED).send(GlobalFunctions.msg(req, res, "msg_plan_expired"));
    }

    // If all checks pass, proceed to the next middleware
    next();
  }

  static incPassword(textPass) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(String(textPass), BCRYPT_SALT_ROUNDS, function (err, hash) {
        if (!err) {
          resolve(hash);
        } else {
          reject(err);
        }
      });
    });
  }

  /** DATA VALIDATE FUNCTIONS >>>>>>>> */
  /**This function is used to validate image only for express-file-upload */
  static validateImage(req, paramName, errMsg) {
    if (!errMsg) {
      errMsg = GlobalFunctions.msgByReq(req, "err_required_field");
    }
    let error = { value: "", msg: "", param: paramName, location: "files" };
    return new Promise((resolve) => {
      /**CHECK REQUIRED */
      if (req.files && req.files[paramName]) {
        const file = req.files[paramName];
        /**CHECK EXTENSION OF FILE */
        if (file.mimetype && ALLOWED_IMAGE_EXT.indexOf(file.mimetype) >= 0) {
          resolve([]);
        } else {
          error.msg = GlobalFunctions.msgByReq(req, "err_invalid_file_type");
          error.value = file.name;
          resolve([error]);
        }
      } else {
        error.msg = errMsg;
        resolve([error]);
      }
    });
  }
  /**This function is used to validate file only for express-file-upload */
  static validateFile(req, paramName, errMsg) {
    if (!errMsg) {
      errMsg = GlobalFunctions.msgByReq(req, "err_required_field");
    }
    let error = { value: "", msg: "", param: paramName, location: "files" };
    return new Promise((resolve) => {
      /**CHECK REQUIRED */
      if (req.files && req.files[paramName]) {
        resolve([]);
      } else {
        error.msg = errMsg;
        resolve([error]);
      }
    });
  }
  /**This function is used to validate email */
  static async validateEmailField(req, paramName, opt, err, res) {
    let options = {
      query: opt && typeof opt.query != "undefined" ? opt.query : false,
      required: opt && typeof opt.required != "undefined" ? opt.required : true,
      valid: opt && typeof opt.valid != "undefined" ? opt.valid : true,
      findInDb: opt && typeof opt.findInDb != "undefined" ? opt.findInDb : false,
      DBField: opt && typeof opt.DBField != "undefined" ? opt.DBField : "",
      DB: opt && typeof opt.DB != "undefined" ? opt.DB : "",
      findJson: opt && typeof opt.findJson != "undefined" ? opt.findJson : {},
    };
    let errMsg = {
      required: err && typeof err.required != "undefined" ? err.required : "admin_err_email_is_required",
      valid: err && typeof err.valid != "undefined" ? err.valid : this.msgByReq(req, "err_invalid_email"),
      exists: err && typeof err.exists != "undefined" ? err.exists : this.msgByReq(req, "err_already_email_list"),
    };
    let chain = body(paramName);
    if (options.query) {
      chain = query(paramName);
    }
    /**CHECK REQUIRED */
    if (options.required) {
      chain.trim().not().isEmpty().withMessage(errMsg.required);
    }
    /**CHECK VALID */
    if (options.valid) {
      chain.isEmail().withMessage(errMsg.valid);
    }
    /**CHECK findInDb */
    if (options.findInDb) {
      chain
        .custom((value) => {
          let findCondition = { ...options.findJson };
          let collection = options.DB;
          findCondition[options.DBField] = value.toLowerCase();
          if (typeof options.DB == "string") {
            collection = dbConnection.collection(options.DB);
          }
          return collection.findOne(findCondition).then((record) => {
            if (record) {
              return Promise.reject();
            } else {
              return Promise.resolve();
            }
          });
        })
        .withMessage(errMsg.exists);
    }
    await chain.run(req);
  }
  /**This function is used to validate mobile number */
  static async validateMobileNumberField(req, paramName, opt, err) {
    let options = {
      query: opt && typeof opt.query != "undefined" ? opt.query : false,
      required: opt && typeof opt.required != "undefined" ? opt.required : true,
      valid: opt && typeof opt.valid != "undefined" ? opt.valid : true,
      findInDb: opt && typeof opt.findInDb != "undefined" ? opt.findInDb : false,
      DBField: opt && typeof opt.DBField != "undefined" ? opt.DBField : "",
      DB: opt && typeof opt.DB != "undefined" ? opt.DB : "",
    };
    let errMsg = {
      required: err && typeof err.required != "undefined" ? err.required : GlobalFunctions.msgByReq(req, "err_required_field"),
      valid: err && typeof err.valid != "undefined" ? err.valid : GlobalFunctions.msgByReq(req, "err_invalid_phone"),
      exists: err && typeof err.exists != "undefined" ? err.exists : GlobalFunctions.msgByReq(req, "err_already_phone_exist"),
    };
    let chain = body(paramName);
    if (options.query) {
      chain = query(paramName);
    }
    /**CHECK REQUIRED */
    if (options.required) {
      chain.trim().not().isEmpty().withMessage(GlobalFunctions.msgByReq(req, "err_required_field"));
    }
    /**CHECK VALID */
    if (options.valid) {
      chain.custom((value, { req }) => {
        if (!value) return true;

        const digitsOnly = value.replace(/\D/g, "");
        req.body[paramName] = value;
        return true;
      });
    }

    /**CHECK findInDb */
    if (options.findInDb) {
      let data = options.query ? req.query[paramName] : req.body[paramName];
      chain.custom((value) => {
        let findCondition = {};
        findCondition[`${options.DBField}`] = data;
        let collection = options.DB;
        if (typeof options.DB == "string") {
          collection = dbConnection.collection(options.DB);
        }
        return new Promise((resolve, reject) => {
          collection.findOne(findCondition).then((record) => {
            if (record) {
              reject(errMsg.exists);
            } else {
              resolve();
            }
          });
        });
      });
    }
    await chain.run(req);
  }
  /**This function is used to validate text fields */
  static async validateTextField(req, paramName, errMsg) {
    if (!errMsg) {
      errMsg = "err_required_field";
    }

    /**CHECK REQUIRED */
    await body(paramName).trim().not().isEmpty().withMessage(errMsg).run(req);
  }

  /**This function is used to validate password fields */
  static async validatePasswordField(req, paramName, opt, err) {
    let options = {
      query: opt && typeof opt.query != "undefined" ? opt.query : false,
      required: opt && typeof opt.required != "undefined" ? opt.required : true,
      valid: opt && typeof opt.valid != "undefined" ? opt.valid : true,
      findInDb: opt && typeof opt.findInDb != "undefined" ? opt.findInDb : false,
      DBField: opt && typeof opt.DBField != "undefined" ? opt.DBField : "",
      DB: opt && typeof opt.DB != "undefined" ? opt.DB : "",
      findJson: opt && typeof opt.findJson != "undefined" ? opt.findJson : {},
    };
    let errMsg = {
      required: err && typeof err.required != "undefined" ? err.required : GlobalFunctions.msgByReq(req, "admin_err_password_is_required"),
      capital_letter: err && typeof err.capital_letter != "undefined" ? err.capital_letter : GlobalFunctions.msgByReq(req, "err_invalid_password"),
      number: err && typeof err.number != "undefined" ? err.number : GlobalFunctions.msgByReq(req, "err_invalid_password"),
      special_character: err && typeof err.special_character != "undefined" ? err.special_character : GlobalFunctions.msgByReq(req, "err_invalid_password"),
      min_length: err && typeof err.min_length != "undefined" ? err.min_length : GlobalFunctions.msgByReq(req, "err_invalid_password"),
    };
    let chain = body(paramName);
    if (options.query) {
      chain = query(paramName);
    }
    /**CHECK REQUIRED */
    if (options.required) {
      chain.trim().not().isEmpty().withMessage(errMsg.required);
    }
    /**CHECK VALID */
    if (options.valid) {
      chain.custom((value) => {
        return new Promise((resolve, reject) => {
          /**checking capital letter */
          /[A-Z]/g.test(value) ? "" : reject(errMsg.capital_letter);
          /[0-9]/g.test(value) ? "" : reject(errMsg.number);
          /[^\w\s]/g.test(value) ? "" : reject(errMsg.special_character);
          new RegExp(`^().{${PASSWORD_MIN_LENGTH},}$`, `g`).test(value) ? "" : reject(errMsg.min_length);
          resolve();
        });
      });
    }
    /**CHECK findInDb */
    if (options.findInDb) {
      chain.custom((value) => {
        let findCondition = { ...options.findJson };
        let collection = options.DB;
        if (typeof options.DB == "string") {
          collection = dbConnection.collection(options.DB);
        }
        return new Promise((resolve, reject) => {
          collection.findOne(findCondition).then((record) => {
            if (record) {
              bcrypt.compare(value, record[options.DBField], (err, isMatch) => {
                if (err) {
                  reject(GlobalFunctions.msgByReq(req, "msg_something_went_wrong"));
                } else {
                  if (isMatch) {
                    reject(GlobalFunctions.msgByReq(req, "err_password_err"));
                  } else {
                    resolve();
                  }
                }
              });
              // return Promise.resolve();
            } else {
              // return Promise.reject();
              reject(GlobalFunctions.msgByReq(req, "err_password_err"));
            }
          });
          // .catch((err)=>{
          //     reject("Something went wrong");
          // });
        });
      });
    }
    await chain.run(req);
  }
  static async validateBooleanField(req, paramName, errMsg) {
    /**CHECK REQUIRED */
    if (!errMsg) {
      errMsg = "err_required_field";
    }
    await body(paramName)
      .trim()
      .not()
      .isEmpty()
      .withMessage(errMsg)
      .custom((value) => {
        return ["true", "false", "1", "0", true, false, 1, 0].indexOf(value) >= 0;
      })
      .withMessage("err_invalid_value")
      .run(req);
  }
  /**This function is used to validate text fields */
  static async validateNumberField(req, paramName, errMsg, options = {}) {
    /**CHECK REQUIRED */
    if (!errMsg) {
      errMsg = "err_required_field";
    }
    let chain = body(paramName);
    chain.trim();
    chain.not();
    chain.isEmpty();
    chain.withMessage(errMsg);
    chain.isNumeric();
    chain.withMessage("err_invalid_value");
    if (options.min) {
      chain.isNumeric({ min: options.min });
      chain.withMessage("err_min_phone_value");
    }
    if (options.max) {
      chain.isNumeric({ max: options.max });
      chain.withMessage("err_max_phone_value");
    }
    await chain.run(req);
  }
  /**This function is used to validate Status Active and Deactive number fields */
  static async validateStatusField(req, paramName, errMsg) {
    /**CHECK REQUIRED */
    if (!errMsg) {
      errMsg = "err_required_field";
    }
    let chain = body(paramName);
    chain.trim();
    chain.not();
    chain.isEmpty();
    chain.withMessage(errMsg).custom((value) => {
      if (value == ACTIVE || value == DE_ACTIVE) {
        return true;
      }
      return false;
    });
    chain.withMessage("err_invalid_status");
    await chain.run(req);
  }
  /** This function is used to check any value exists in Object or Array*/
  static async isExistsInVar(req, paramName, variable, errMsg) {
    if (!errMsg) {
      errMsg = "err_required_field";
    }
    let chain = body(paramName).custom((value) => {
      if (Array.isArray(variable)) {
        return variable.indexOf(value) >= 0;
      } else if (typeof variable == "object") {
        return Object.values(variable).indexOf(value) >= 0;
      }
      return false;
    });
    chain.withMessage(errMsg);
    await chain.run(req);
  }
  /**This function is used to validate text fields */
  static async validateObjectField(req, paramName, errMsg) {
    if (!errMsg) {
      errMsg = "err_required_field";
    }
    /**CHECK REQUIRED */
    await body(paramName)
      .trim()
      .not()
      .isEmpty()
      .withMessage(errMsg)
      .custom((value) => {
        try {
          if (Object.keys(value).length > 0) {
            JSON.parse(value);
            return true;
          } else {
            return false;
          }
        } catch (err) {
          return false;
        }
      })
      .withMessage(GlobalFunctions.msgByReq(req, "err_invalid_value"))
      .run(req);
  }
  static async validateObjId(req, paramName, opt, err) {
    let options = {
      query: opt && typeof opt.query != "undefined" ? opt.query : false,
      param: opt && typeof opt.param != "undefined" ? opt.param : false,
      required: opt && typeof opt.required != "undefined" ? opt.required : true,
      valid: opt && typeof opt.valid != "undefined" ? opt.valid : true,
      findInDb: opt && typeof opt.findInDb != "undefined" ? opt.findInDb : false,
      DBField: opt && typeof opt.DBField != "undefined" ? opt.DBField : "",
      DB: opt && typeof opt.DB != "undefined" ? opt.DB : "",
      findJson: opt && typeof opt.findJson != "undefined" ? opt.findJson : {},
    };
    let errMsg = {
      required: err && typeof err.required != "undefined" ? err.required : "err_required_field",
      valid: err && typeof err.valid != "undefined" ? err.valid : "err_invalid_id",
    };
    let chain = body(paramName);
    if (options.query) {
      chain = query(paramName);
    } else if (options.param) {
      chain = param(paramName);
    }
    /**CHECK REQUIRED */
    if (options.required) {
      chain.trim().not().isEmpty().withMessage(errMsg.required);
    }
    /**CHECK VALID */
    if (options.valid) {
      chain
        .custom((value) => {
          if (ObjectId.isValid(value)) {
            return true;
          }
          return false;
        })
        .withMessage(errMsg.valid);
    }
    /**CHECK findInDb */
    if (options.findInDb) {
      chain
        .custom((value) => {
          let findCondition = { ...options.findJson };
          let collection = options.DB;
          findCondition[options.DBField] = new ObjectId(value);
          if (typeof options.DB == "string") {
            collection = dbConnection.collection(options.DB);
          }
          return collection.findOne(findCondition).then((record) => {
            if (record) {
              return Promise.resolve();
            } else {
              return Promise.reject();
            }
          });
        })
        .withMessage(MESSAGE.RECORD_NOT_FOUND);
    }
    await chain.run(req);
  }
  static async validateStringWithDB(req, paramName, opt, err) {
    let options = {
      query: opt && typeof opt.query != "undefined" ? opt.query : false,
      required: opt && typeof opt.required != "undefined" ? opt.required : true,
      valid: opt && typeof opt.valid != "undefined" ? opt.valid : true,
      findInDb: opt && typeof opt.findInDb != "undefined" ? opt.findInDb : false,
      DBField: opt && typeof opt.DBField != "undefined" ? opt.DBField : "",
      DB: opt && typeof opt.DB != "undefined" ? opt.DB : "",
      DBFindJson: opt && typeof opt.DBFindJson != "undefined" ? opt.DBFindJson : {},
    };
    let errMsg = {
      required: err && typeof err.required != "undefined" ? err.required : GlobalFunctions.msgByReq(req, "err_required_field"),
      valid: err && typeof err.valid != "undefined" ? err.valid : GlobalFunctions.msgByReq(req, "err_invalid_data"),
      alreadyExists: err && typeof err.alreadyExists != "undefined" ? err.alreadyExists : GlobalFunctions.msgByReq(req, "err_content_already_exist"),
    };
    let chain = body(paramName);
    if (options.query) {
      chain = query(paramName);
    }
    /**CHECK REQUIRED */
    if (options.required) {
      chain.trim().not().isEmpty().withMessage(GlobalFunctions.msgByReq(req, "err_required_field"));
    }
    /**CHECK findInDb */
    if (options.findInDb) {
      chain
        .custom((value) => {
          let findCondition = options.DBFindJson;
          let collection = options.DB;
          findCondition[options.DBField] = {
            $regex: new RegExp(`^${value}$`),
            $options: "i",
          };
          if (typeof options.DB == "string") {
            collection = dbConnection.collection(options.DB);
          }
          return collection.findOne(findCondition).then((record) => {
            if (record) {
              return Promise.reject();
            } else {
              return Promise.resolve();
            }
          });
        })
        .withMessage(errMsg.alreadyExists);
    }
    await chain.run(req);
  }
  /** DATA VALIDATE FUNCTIONS <<<<<<<< */

  /** DATA QUERIES >>>>>>>> */

  static userImageQuery() {
    console.log("check", FILES_URL, DEFAULT_USER_PROFILE, process.env.BASE_URL);
    const filterQuery = {
      $cond: {
        if: "$profile_image",
        then: { $concat: [FILES_URL, "users/", "$profile_image"] },
        else: { $concat: [process.env.BASE_URL + "/", "configs/default/", DEFAULT_USER_PROFILE] },
      },
    };
    return filterQuery;
  }

  static buildLookbookImageUrl(profile_image) {
    if (!profile_image) {
      return process.env.BASE_URL + "/configs/default/" + DEFAULT_USER_PROFILE;
    }

    // If already a full URL, return as is
    if (typeof profile_image === "string" && (profile_image.startsWith("http://") || profile_image.startsWith("https://"))) {
      return profile_image;
    }

    // If it's a string, remove "uploads/users/" prefix if exists and build URL
    if (typeof profile_image === "string") {
      const cleanPath = profile_image.replace("uploads/lookbook/", "").replace(/^\/+/, "");
      return FILES_URL + "lookbook/" + cleanPath;
    }

    return process.env.BASE_URL + "/configs/default/" + DEFAULT_USER_PROFILE;
  }

  static buildUserImageUrl(profile_image) {
    if (!profile_image) {
      return process.env.BASE_URL + "/configs/default/" + DEFAULT_USER_PROFILE;
    }

    // If already a full URL, return as is
    if (typeof profile_image === "string" && (profile_image.startsWith("http://") || profile_image.startsWith("https://"))) {
      return profile_image;
    }

    // If it's a string, remove "uploads/users/" prefix if exists and build URL
    if (typeof profile_image === "string") {
      const cleanPath = profile_image.replace("uploads/users/", "").replace(/^\/+/, "");
      return FILES_URL + "users/" + cleanPath;
    }

    return process.env.BASE_URL + "/configs/default/" + DEFAULT_USER_PROFILE;
  }

  static buildItemImageUrl(profile_image) {
    if (!profile_image) {
      return process.env.BASE_URL + "/configs/default/" + DEFAULT_USER_PROFILE;
    }

    // If already a full URL, return as is
    if (typeof profile_image === "string" && (profile_image.startsWith("http://") || profile_image.startsWith("https://"))) {
      return profile_image;
    }

    // If it's a string, remove "uploads/users/" prefix if exists and build URL
    if (typeof profile_image === "string") {
      const cleanPath = profile_image.replace("uploads/items/", "").replace(/^\/+/, "");
      return FILES_URL + "items/" + cleanPath;
    }

    return process.env.BASE_URL + "/configs/default/" + DEFAULT_USER_PROFILE;
  }

  static userMultiImageQuery() {
    const filterQuery = {
      $map: {
        input: "$images", // Assuming image_array is the array field in your document containing image names
        as: "images",
        in: {
          $cond: {
            if: { $eq: ["$$images", ""] }, // Check if the image field is empty
            then: { $concat: [process.env.BASE_URL + "/", "configs/default/", DEFAULT_USER_PROFILE] }, // If empty, use default image
            else: { $concat: [FILES_URL, "users/", "$$images"] }, // If not empty, use the user's image
          },
        },
      },
    };
    return filterQuery;
  }

  static itemMultiImageQuery() {
    const filterQuery = {
      $map: {
        input: "$images", // Assuming image_array is the array field in your document containing image names
        as: "images",
        in: {
          $cond: {
            if: { $eq: ["$$images", ""] }, // Check if the image field is empty
            then: { $concat: [process.env.BASE_URL + "/", "configs/default/", DEFAULT_USER_PROFILE] }, // If empty, use default image
            else: { $concat: [FILES_URL, "items/", "$$images"] }, // If not empty, use the user's image
          },
        },
      },
    };
    return filterQuery;
  }

  static buildUploadUrl(path, defaultUrl = null) {
    if (!path) return defaultUrl;

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const cleanPath = path.startsWith("/") ? path.slice(1) : path;

    return process.env.BASE_URL + "/" + cleanPath;
  }

  static buildUploadUrls(paths = []) {
    if (!Array.isArray(paths)) return [];

    return paths.map((p) => this.buildUploadUrl(p));
  }

  /**
   * Hide likes/comments payload for non-owners when post flags are on.
   * Owner still sees full data. isLiked is preserved so liking still works.
   */
  static applyPostHideFlags(post, viewerId) {
    if (!post) return post;

    const creator = post.createdBy;
    const creatorId = creator && (creator._id || creator);
    const isOwner =
      creatorId &&
      viewerId &&
      creatorId.toString() === viewerId.toString();

    if (isOwner) return post;

    if (post.hideLikes) {
      post.likesCount = null;
      post.likedBy = [];
      post.likes = [];
    }

    if (post.hideComments) {
      post.commentsCount = null;
      post.comments = [];
    }

    return post;
  }

  static userImageQueryLogo(conditionalKey = "profile_image") {
    const filterQuery = {
      $cond: {
        if: "$" + conditionalKey,
        then: { $concat: [FILES_URL, "users/", "$" + conditionalKey] },
        else: { $concat: [process.env.BASE_URL + "/", "configs/default/", DEFAULT_USER_PROFILE] },
      },
    };
    return filterQuery;
  }

  static userImageQueryField(field, folder) {
    const filterQuery = {
      $cond: {
        if: `$${field}`,
        then: { $concat: [FILES_URL, `${folder}/`, `$${field}`] },
        else: { $concat: [process.env.BASE_URL + "/", "configs/default/", DEFAULT_USER_PROFILE] },
      },
    };
    return filterQuery;
  }

  static userDataQuery(nameAs = "user_data", key = "user_id", projection = {}, findJson = []) {
    const filterQuery = {
      $lookup: {
        from: "users",
        let: { recordId: "$" + key },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$recordId"] }, ...findJson],
              },
            },
          },
          {
            $project: {
              email: 1,
              name: 1,
              profile_image: 1,
              phone_number: 1,
              full_name: 1,
              first_name: 1,
              last_name: 1,
              username: 1,
              privacy_settings: 1,
              followers_users: 1,
              ...projection,
            },
          },
        ],
        as: nameAs,
      },
    };
    return filterQuery;
  }

  /** DATA QUERIES >>>>>>>> */

  static getOtp(length) {
    // let finalResult = randomstring.generate(length);
    let finalResult = "";
    let arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let arr2 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    for (let i = 0; i < length; i++) {
      if (i == 0) {
        let ind = Math.floor(Math.random() * 8);
        finalResult += arr1[ind];
      } else {
        let ind = Math.floor(Math.random() * 9);
        finalResult += arr2[ind];
      }
    }
    // for (let i = 0; i < length; i++) {
    //     finalResult += i + 1;
    // }
    // return Number(finalResult);
    return finalResult;
  }

  static getUserData(find = {}) {
    return new Promise((resolve, reject) => {
      let findJson = find;
      if (ObjectId.isValid(find)) {
        findJson = { _id: new ObjectId(find) };
      }
      UserModel.aggregate([
        { $match: findJson },
        {
          $project: {
            name: 1,
            role: 1,
            title: 1,
            gender: 1,
            email: 1,
            token: 1,
            address: 1,
            last_name: 1,
            updatedAt: 1,
            createdAt: 1,
            first_name: 1,
            extra_info: 1,
            fcm_token: 1,
            middle_name: 1,
            phone_number: 1,
            event_function: 1,
            phone_number_work: 1,
            full_name: 1,
            username: 1,
            DOB: 1,
            referral_link: 1,
            gender: 1,
            subscribed_for_newsletter: 1,
            business_name: 1,
            professional_category: 1,
            tagline: 1,
            short_bio: 1,
            long_bio: 1,
            email: 1,
           is_email_verified:1,
            countryCode: 1,
            phone_number: 1,
            city: 1,
            experience: 1,
            expertise: 1,
            social_media_details: 1,
            public_profile: 1,
            phone_no_public: 1,
            display_certificate: 1,
            show_social_links: 1,
            profile_image: GlobalFunctions.userImageQuery(),
            st_business_profile: GlobalFunctions.userImageQuery(),
            certificates: GlobalFunctions.userImageQuery(),
          },
        },
      ])
        .exec()
        .then((result) => {
          if (result && result.length > 0) {
            resolve(result[0]);
          } else {
            resolve({});
          }
        });
    });
  }

  /** Chat: save message to DB */
  static async saveMessage(data) {
    let { sender_id, receiver_id, room } = data || {};
    if (!receiver_id && room) {
      const existingMsg = await MessagesModel.findOne({ room }).lean();
      if (existingMsg) {
        receiver_id = String(existingMsg.sender_id) === String(sender_id) ? existingMsg.receiver_id : existingMsg.sender_id;
      }
    }
    if (sender_id && receiver_id && mongoose.Types.ObjectId.isValid(sender_id) && mongoose.Types.ObjectId.isValid(receiver_id)) {
      const UserModel = (await import("../models/users.js")).default;
      const isBlocked = await UserModel.exists({
        $or: [
          { _id: new mongoose.Types.ObjectId(sender_id), blocked_users: new mongoose.Types.ObjectId(receiver_id) },
          { _id: new mongoose.Types.ObjectId(receiver_id), blocked_users: new mongoose.Types.ObjectId(sender_id) },
        ],
      });
      if (isBlocked) {
        throw new Error("Cannot send message. User is blocked.");
      }
    }
    const record = new MessagesModel(data);
    await record.save();
    return record;
  }

  /** Chat: update message text */
  static async editMessage(data) {
    await MessagesModel.updateOne(
      { _id: data._id },
      { $set: { message: data.message } }
    );
  }

  /** Emit in-app notification to user's notification room (receiver_id as room) */
  static async sendWebNotification(data) {
    try {
      const { default: SocketHelper } = await import("./socket.js");
      const io = SocketHelper.getIo();
      if (io && data.receiver_id) {
        io.to(String(data.receiver_id)).emit("notificationReceive", data);
      }
    } catch (e) {
      // Socket may not be set yet
    }
  }

  static removeExtraSpaces(string) {
    if (typeof string !== "string") {
      return "";
    }
    const trimmedString = string.trim();
    return trimmedString.replace(/\s+/g, " ");
  }

  static capitalizeFirstLetter(string) {
    if (typeof string !== "string" || string.length === 0) {
      return "";
    }
    const str = GlobalFunctions.removeExtraSpaces(string);
    return str[0].toUpperCase() + str.slice(1);
  }

  static uploadFile(req, param, uploadDir, fixedFileName = null, fixedExtension = null) {
    return new Promise((resolve, reject) => {
      const filesDirPath = UPLOAD_FILE_PATH + uploadDir;
      if (req.files && req.files[param]) {
        if (Array.isArray(req.files[param])) {
          const files = req.files[param];
          const fileNames = [];
          let flag = 0;
          function uploadLoop() {
            const file = files[flag];
            GlobalFunctions.createDir(filesDirPath).then(() => {
              const fileNameArr = file.name.split(".");
              const fileNameUniqueChars = Math.floor(Math.random() * 10000);
              let fileName = null;
              if (fixedFileName) {
                fileName = fixedFileName;
              } else {
                fileName = slugify(file.name.slice(0, file.name.indexOf(".")), "_") + new Date().getTime() + fileNameUniqueChars + "." + (fixedExtension || fileNameArr[fileNameArr.length - 1]);
              }
              fileNames.push(fileName);
              file.mv(filesDirPath + "/" + fileName, async (err) => {
                if (err) {
                  reject(err);
                } else {
                  await GlobalFunctions.compressImage(filesDirPath + "/" + fileName);
                  if (flag == files.length - 1) {
                    resolve(fileNames);
                  } else {
                    flag++;
                    uploadLoop();
                  }
                }
              });
            });
          }
          uploadLoop();
        } else {
          const file = req.files[param];
          GlobalFunctions.createDir(filesDirPath).then(() => {
            const fileNameArr = file.name.split(".");
            let fileName = null;
            if (fixedFileName) {
              fileName = fixedFileName;
            } else {
              fileName = slugify(file.name.slice(0, file.name.indexOf(".")), "_") + new Date().getTime() + "." + (fixedExtension || fileNameArr[fileNameArr.length - 1]);
            }
            file.mv(filesDirPath + "/" + fileName, async (err) => {
              if (err) {
                reject(err);
              } else {
                if (file.mimetype != "audio/webm") {
                  await GlobalFunctions.compressImage(filesDirPath + "/" + fileName);
                }
                resolve(fileName);
              }
            });
          });
        }
      } else {
        resolve(false);
      }
    });
  }

  static uploadFileWithoutBg(req, param, uploadDir, fixedFileName = null) {
    return new Promise((resolve, reject) => {
      const filesDirPath = UPLOAD_FILE_PATH + uploadDir;
      if (req.files && req.files[param]) {
        if (Array.isArray(req.files[param])) {
          const files = req.files[param];
          const fileNames = [];
          let flag = 0;
          async function uploadLoop() {
            const file = files[flag];
            await GlobalFunctions.createDir(filesDirPath);
            const fileNameUniqueChars = Math.floor(Math.random() * 10000);
            const fileName = fixedFileName || slugify(file.name.slice(0, file.name.indexOf(".")), "_") + new Date().getTime() + fileNameUniqueChars + ".png";
            const tempPath = filesDirPath + "/temp_" + fileName;
            const outputPath = filesDirPath + "/" + fileName;

            file.mv(tempPath, async (err) => {
              if (err) {
                reject(err);
              } else {
                try {
                  const blob = await removeBackground(tempPath);
                  const buffer = Buffer.from(await blob.arrayBuffer());
                  fs.writeFileSync(outputPath, buffer);
                  fs.unlinkSync(tempPath);
                  fileNames.push(fileName);

                  if (flag == files.length - 1) {
                    resolve(fileNames);
                  } else {
                    flag++;
                    uploadLoop();
                  }
                } catch (error) {
                  fs.unlinkSync(tempPath);
                  reject(error);
                }
              }
            });
          }
          uploadLoop();
        } else {
          const file = req.files[param];
          GlobalFunctions.createDir(filesDirPath).then(async () => {
            const fileName = fixedFileName || slugify(file.name.slice(0, file.name.indexOf(".")), "_") + new Date().getTime() + ".png";
            const tempPath = filesDirPath + "/temp_" + fileName;
            const outputPath = filesDirPath + "/" + fileName;

            file.mv(tempPath, async (err) => {
              if (err) {
                reject(err);
              } else {
                try {
                  const blob = await removeBackground(tempPath);
                  const buffer = Buffer.from(await blob.arrayBuffer());
                  fs.writeFileSync(outputPath, buffer);
                  fs.unlinkSync(tempPath);
                  resolve(fileName);
                } catch (error) {
                  fs.unlinkSync(tempPath);
                  reject(error);
                }
              }
            });
          });
        }
      } else {
        resolve(false);
      }
    });
  }
  static async removeBgAndReturnUrl(file) {
    const { UPLOAD_FILE_PATH, FILES_URL } = await import("../global-variable.js");
    const uploadDir = UPLOAD_FILE_PATH + "remove-bg";
    await GlobalFunctions.createDir(uploadDir);
    const fileName = slugify(file.name.slice(0, file.name.indexOf(".")), "_") + Date.now() + ".png";
    const tempPath = uploadDir + "/temp_" + fileName;
    const outputPath = uploadDir + "/" + fileName;
    await file.mv(tempPath);
    try {
      const blob = await removeBackground(tempPath);
      const buffer = Buffer.from(await blob.arrayBuffer());

      // Post-process mask:
      // 1) remove near-white leftovers
      // 2) crop to non-transparent object bounds
      const sharpObj = sharp(buffer).ensureAlpha();
      const { data, info } = await sharpObj.raw().toBuffer({ resolveWithObject: true });
      const rgba = Buffer.from(data);

      let minX = info.width;
      let minY = info.height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const idx = (y * info.width + x) * 4;
          const r = rgba[idx];
          const g = rgba[idx + 1];
          const b = rgba[idx + 2];
          let a = rgba[idx + 3];

          const isNearWhite = r >= 245 && g >= 245 && b >= 245;
          if (a > 0 && isNearWhite) {
            a = 0;
            rgba[idx + 3] = 0;
          }

          if (a > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      let finalSharp = sharp(rgba, {
        raw: { width: info.width, height: info.height, channels: 4 },
      });

      if (maxX >= minX && maxY >= minY) {
        finalSharp = finalSharp.extract({
          left: minX,
          top: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        });
      }

      await finalSharp.png({ compressionLevel: 9 }).toFile(outputPath);
      fs.unlinkSync(tempPath);
      return FILES_URL + "remove-bg/" + fileName;
    } catch (err) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw err;
    }
  }

  static copyFile(sourcePth, destinationPath) {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(sourcePth)) {
        fs.copyFileSync(sourcePth, destinationPath);
        resolve(destinationPath);
      } else {
        resolve();
      }
    });
  }
  static compressImage(filePath) {
    return new Promise((resolve) => {
      // const fileNameArr = filePath.split('.');
      // let fileExt = fileNameArr[fileNameArr.length - 1];
      // if(ALLOWED_IMAGE_EXT.indexOf(fileExt)){

      // }
      // const stats = fs.statSync(filePath);
      // const fileSizeInKB = Math.floor(stats.size/1024);/**File size in KB */
      // if(fileSizeInKB > 600){
      const settings = {
        quality: 50,
      };
      const extensionsArray = filePath.split(".");
      const extension = extensionsArray[extensionsArray.length - 1];
      if (["jpg", "jpeg", "png", "webp"].indexOf(extension) >= 0) {
        let chain = sharp(filePath);
        if (extension == "jpg" || extension == "jpeg") {
          chain.jpeg(settings);
        }
        if (extension == "png") {
          chain.png(settings);
        }
        if (extension == "webp") {
          chain.webp(settings);
        }
        chain.toBuffer((err, buffer) => {
          if (err || !buffer) {
            console.error("Image compression failed:", err);
            return resolve();
          }
          fs.writeFile(filePath, buffer, function (e) {
            resolve();
          });
        });
      } else {
        resolve();
      }
      // }else{
      //     resolve();
      // }
    });
  }

  static getBoolean(data) {
    if (data == true) {
      return true;
    } else if (data == "true") {
      return true;
    } else if (data == false) {
      return false;
    } else if (data == "false") {
      return false;
    }
    if (data == 1) {
      return true;
    } else if (data == "1") {
      return true;
    } else if (data == 0) {
      return false;
    } else if (data == "0") {
      return false;
    }
    if (data == "") {
      return false;
    } else {
      return Boolean(data);
    }
  }
  static isBoolean(data) {
    return ["true", "false", "1", "0", true, false, 1, 0].indexOf(data) >= 0;
  }

  static manageGraphData(req, result) {
    const timeLimit = req.query.time_limit || "this_week";
    const today = new Date();
    let data = { labels: [], counts: [] };
    const dataLength = result.length;
    for (let i = 0; i < dataLength; i++) {
      const date = new Date(result[i]._id);
      if (timeLimit == "this_week") {
        if (date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear()) {
          data.labels.push("Today");
        } else {
          data.labels.push(DAYS[date.getDay()]);
        }
        data.counts.push(result[i].data.length);
      }
      if (timeLimit == "last_month") {
        if (date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear()) {
          data.labels.push("Today");
        } else {
          data.labels.push(`${date.getDate()} ${MONTHS[date.getMonth()]}`);
        }
        data.counts.push(result[i].data.length);
      }
      if (timeLimit == "last_year") {
        data.labels.push(`${MONTHS[date.getMonth()]} ${date.getFullYear()}`);
        data.counts.push(result[i].data.length);
      }
      if (timeLimit == "custom_range") {
        let start = new Date(result[0]._id);
        let end = new Date(result[dataLength - 1]._id);
        if (start.getMonth() == end.getMonth() && start.getFullYear() == end.getFullYear()) {
          if (date.getDate() == today.getDate() && date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear()) {
            data.labels.push("Today");
          } else {
            data.labels.push(`${date.getDate()} ${MONTHS[date.getMonth()]}`);
          }
        } else {
          data.labels.push(`${MONTHS[date.getMonth()]} ${date.getFullYear()}`);
        }
        data.counts.push(result[i].data.length);
      }
    }
    return data;
  }

  static myToFixed(price) {
    let number = Number(price);
    if (number) {
      return number.toFixed(2);
    } else {
      return 0;
    }
  }
  static getTimeFilter(req, column = "createdAt") {
    const timeLimit = req.query.time_limit || "last_5_months";
    let groupBy,
      limit = 0,
      json = {},
      startDate,
      endDate,
      chartMode = "monthly";
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    switch (timeLimit) {
      case "today": {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = today;
        groupBy = "%Y-%m-%d";
        chartMode = "total";
        json["$and"] = [{ [column]: { $gte: startDate } }, { [column]: { $lte: endDate } }];
        break;
      }
      case "last_month": {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = today;
        groupBy = "%Y-%m-%d";
        chartMode = "total";
        json["$and"] = [{ [column]: { $gte: startDate } }, { [column]: { $lte: endDate } }];
        break;
      }
      case "last_5_months": {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 4);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = today;
        groupBy = "%Y-%m";
        chartMode = "monthly";
        json["$and"] = [{ [column]: { $gte: startDate } }, { [column]: { $lte: endDate } }];
        break;
      }
      case "custom_range": {
        if (req.query.custom_range) {
          try {
            let dates = JSON.parse(req.query.custom_range);
            startDate = new Date(dates.start);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(dates.end);
            endDate.setHours(23, 59, 59, 999);
            const sameDay =
              startDate.getDate() === endDate.getDate() &&
              startDate.getMonth() === endDate.getMonth() &&
              startDate.getFullYear() === endDate.getFullYear();
            const sameMonth =
              startDate.getMonth() === endDate.getMonth() &&
              startDate.getFullYear() === endDate.getFullYear();
            if (sameDay || sameMonth) {
              groupBy = "%Y-%m-%d";
              chartMode = "total";
            } else {
              groupBy = "%Y-%m";
              chartMode = "monthly";
            }
            json["$and"] = [{ [column]: { $gte: startDate } }, { [column]: { $lte: endDate } }];
          } catch (err) { }
        }
        break;
      }
      default: {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = today;
        groupBy = "%Y-%m-%d";
        chartMode = "total";
        json["$and"] = [{ [column]: { $gte: startDate } }, { [column]: { $lte: endDate } }];
        break;
      }
    }
    return { groupBy, limit, json, startDate, endDate, chartMode };
  }

  static getPeriodKeys(startDate, endDate, groupBy) {
    const keys = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);

    if (groupBy === "%Y-%m-%d") {
      while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        const d = String(current.getDate()).padStart(2, "0");
        keys.push(`${y}-${m}-${d}`);
        current.setDate(current.getDate() + 1);
      }
    } else {
      current.setDate(1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (current <= endMonth) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, "0");
        keys.push(`${y}-${m}`);
        current.setMonth(current.getMonth() + 1);
      }
    }
    return keys;
  }

  static formatOverviewLabel(periodKey, timeLimit, groupBy) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let date;
    if (groupBy === "%Y-%m") {
      const [y, m] = periodKey.split("-").map(Number);
      date = new Date(y, m - 1, 1);
    } else {
      date = new Date(periodKey);
      date.setHours(0, 0, 0, 0);
    }

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (timeLimit === "this_week") {
      return isToday ? "Today" : DAYS[date.getDay()];
    }
    if (timeLimit === "last_month" || (timeLimit === "custom_range" && groupBy === "%Y-%m-%d")) {
      return isToday ? "Today" : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    }
    return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  static getTotalOverviewLabel(timeLimit, startDate, endDate) {
    if (timeLimit === "today") {
      const d = new Date(startDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${day}.${month}.${d.getFullYear()}`;
    }
    if (timeLimit === "this_week") return "Last 7 Days";
    if (timeLimit === "last_month") return "Last 30 Days";
    if (timeLimit === "custom_range") {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const fmt = (d) => {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${day}.${month}.${d.getFullYear()}`;
      };
      return `${fmt(start)} - ${fmt(end)}`;
    }
    return "Total";
  }

  static buildTotalOverviewData(req, timeFilter, totalValue) {
    const timeLimit = req.query.time_limit || "last_5_months";
    const label = GlobalFunctions.getTotalOverviewLabel(
      timeLimit,
      timeFilter.startDate,
      timeFilter.endDate
    );
    return { labels: [label], values: [totalValue ?? 0] };
  }

  static buildFilledOverviewData(req, timeFilter, dataMap) {
    if (!timeFilter.startDate || !timeFilter.endDate) {
      return { labels: [], values: [] };
    }
    const timeLimit = req.query.time_limit || "last_5_months";
    const periodKeys = GlobalFunctions.getPeriodKeys(
      timeFilter.startDate,
      timeFilter.endDate,
      timeFilter.groupBy
    );
    const labels = periodKeys.map((key) =>
      GlobalFunctions.formatOverviewLabel(key, timeLimit, timeFilter.groupBy)
    );
    const values = periodKeys.map((key) => dataMap[key] ?? 0);
    return { labels, values };
  }
  static getAllowedOrigins() {
    let origins = process.env.WHITELIST_ORIGINS ? process.env.WHITELIST_ORIGINS.split(",") : [];
    if (origins && origins.length) {
      if (origins.indexOf(process.env.WEB_URL) === -1) {
        origins.push(process.env.WEB_URL);
      }
      return origins;
    } else {
      return [process.env.WEB_URL];
    }
  }
  static getUserDynamicStrings(json, shouldFind = true, userData) {
    let obj = {};
    function getRoleName(role) {
      let roleName = "";
      switch (Number(role)) {
        case USER_ROLES.SUPER_ADMIN:
          roleName = "super_admin";
          break;
        case USER_ROLES.SUB_ADMIN:
          roleName = "Sub Admin";
          break;
        case USER_ROLES.STAFF:
          roleName = "Staff";
          break;
        case USER_ROLES.USER:
          roleName = "User";
          break;
      }
      return roleName;
    }
    if (shouldFind) {
      return new Promise((resolve) => {
        UserModel.findOne(json).then((result) => {
          if (result) {
            let name = result.first_name;
            if (result.middle_name) {
              name += " " + result.middle_name;
            }
            name += " " + result.last_name;
            obj = {
              name: name,
              title: result.title,
              first_name: result.first_name,
              middle_name: result.middle_name,
              last_name: result.last_name,
              email: result.email,
              function_name: result.event_function,
              otp: result.otp,
              username: result.name,
              salutation: result.gender,
              role: getRoleName(result.role),
            };
            if (result.phone_number) {
              obj["phone_number"] = (result.phone_number.code || "") + " " + (result.phone_number.number || "");
            }
            if (result.phone_number_work) {
              obj["work_phone_number"] = (result.phone_number_work.code || "") + " " + (result.phone_number_work.number || "");
            }
          }
          resolve(obj);
        });
      });
    } else {
      const result = userData;
      let name = result.first_name;
      if (result.middle_name) {
        name += " " + result.middle_name;
      }
      name += " " + result.last_name;
      obj = {
        name: name,
        title: result.title,
        first_name: result.first_name,
        middle_name: result.middle_name,
        last_name: result.last_name,
        email: result.email,
        function_name: result.event_function,
        otp: result.otp,
        salutation: result.gender,
        username: result.name,
        role: getRoleName(result.role),
      };
      if (result.phone_number) {
        obj["phone_number"] = (result.phone_number.code || "") + " " + (result.phone_number.number || "");
      }
      if (result.phone_number_work) {
        obj["work_phone_number"] = (result.phone_number_work.code || "") + " " + (result.phone_number_work.number || "");
      }
      return obj;
    }
  }
  static getRequiredProfileFields() {
    return new Promise((resolve) => {
      GlobalSettingsModel.findOne({})
        .then((result) => {
          resolve(result);
        })
        .catch((err) => { });
    });
  }

  static msg(req, res, key, dynamicOptions = []) {
    let lang = req.headers.language ? req.headers.language : "en";
    let str = res.__({ phrase: key, locale: lang });
    dynamicOptions.forEach((string) => {
      str = str.replace(/{{(.*?)}}/, string);
    });
    return str;
  }

  static msgByReq(req, key, dynamicOptions = []) {
    let lang = req.headers.language ? req.headers.language : "en";
    let str = "";
    if (lang === "en") {
      str = enJSON[key];
    } else if (lang === "ja") {
      str = jaJSON[key];
    }
    dynamicOptions.forEach((string) => {
      str = str.replace(/{{(.*?)}}/, string);
    });
    return str;
  }

  static addDaysToDate(daysToAdd) {
    let date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    let newDateString = date.toISOString();
    return newDateString;
  }

  static calculateDaysInExpiry(expiryDate) {
    const currentDate = new Date();
    const expiry = new Date(expiryDate);
    const timeDiff = expiry - currentDate;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert milliseconds to days

    if (daysDiff < 0) {
      return -1; // Return -1 if the expiry date has passed
    }

    return daysDiff;
  }

  // here we are calculating next expiry date via number of adding days
  // static  calculateNewExpiryDate( days_in_expiry, add_days) {

  //   let baseDate;
  //   if (days_in_expiry > 0) {
  //     baseDate = new Date();
  //     baseDate.setDate(baseDate.getDate() + (Number(add_days) + Number(days_in_expiry)));
  //     console.log(baseDate)
  //   } else {
  //       baseDate = new Date();
  //       baseDate.setDate(baseDate.getDate() + add_days);
  //   }

  //   let formattedDate = baseDate.toISOString();

  //   return formattedDate;
  // }

  static calculateNewExpiryDate(days_in_expiry, plan_type) {
    let baseDate = new Date();

    if (days_in_expiry > 0 && plan_type === "yearly") {
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      baseDate.setDate(baseDate.getDate() + Number(days_in_expiry));
    } else {
      baseDate.setMonth(baseDate.getMonth() + 1);
      baseDate.setDate(baseDate.getDate() + Number(days_in_expiry));
    }

    let formattedDate = baseDate.toISOString();
    return formattedDate;
  }

  static TrDBKey(req, key, fileUrl = null, isUsingAddFields = false) {
    const lang = req.headers["language"] ? req.headers["language"] : "en";
    if (fileUrl) {
      let obj =
        lang == "en"
          ? { $concat: [fileUrl, `$${key}`] }
          : {
            $cond: {
              if: {
                $ne: [{ $ifNull: [`$${key}_${lang}`, ""] }, ""],
              },
              then: { $concat: [fileUrl, `$${key}_${lang}`] },
              else: { $concat: [fileUrl, `$${key}`] },
            },
          };
      return obj;
    } else {
      let ENProjection = isUsingAddFields ? `$${key}` : 1;
      let obj =
        lang == "en"
          ? ENProjection
          : {
            $cond: {
              if: {
                $ne: [{ $ifNull: [`$${key}_${lang}`, ""] }, ""],
              },
              then: `$${key}_${lang}`,
              else: `$${key}`,
            },
          };
      return obj;
    }
  }

  static async verifyAppleToken(id_token) {
    const decoded = jwt.decode(id_token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) throw new Error("Invalid Apple ID token");

    const keysJson = await new Promise((resolve, reject) => {
      https.get("https://appleid.apple.com/auth/keys", (res) => {
        let data = "";
        res.on("data", (ch) => (data += ch));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });

    const jwk = keysJson.keys.find((k) => k.kid === decoded.header.kid);
    if (!jwk) throw new Error("Apple signing key not found");

    const publicKey = crypto.createPublicKey({
      key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
      format: "jwk",
    });

    return jwt.verify(id_token, publicKey, { algorithms: ["RS256"], issuer: "https://appleid.apple.com" });
  }

  static async extractThumbnail(videoPath, outputDir) {
    return new Promise((resolve, reject) => {
      const thumbName = `thumb_${Date.now()}.jpg`;

      ffmpeg(videoPath)
        .screenshots({
          timestamps: ["00:00:01"],
          filename: thumbName,
          folder: outputDir,
          size: "720x?",
        })
        .on("end", () => resolve(thumbName))
        .on("error", (err) => reject(err));
    });
  };

  static async calculateProfileCompletion(user) {
    const isValid = (v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== null && v !== undefined && v !== "";
    };

    const fields = [
      user.first_name, user.last_name, user.username, user.DOB,
      user.address, user.gender, user.goals,

      user.preferred_colors, user.brands,

      user.sizes?.shirt_size, user.sizes?.trouser_size, user.sizes?.shoe_size, user.sizes?.wrist_size,
      user.measurement?.height, user.measurement?.waist, user.measurement?.bust, user.measurement?.hip,


      user.body_type, user.complexion, user.hair_color,
      user.hair_type, user.eye_color, user.face_shape,

      user.style, user.style_desc, user.mood_board,
      user.pinterest_link, user.sustain_preferences,

      user.closetPrivacy,
    ];

    // console.log('=== PROFILE COMPLETION DEBUG ===');
    // console.log('TOTAL fields:', fields.length);
    // console.log('Field values:', fields.map((f, i) => ({ i, valid: isValid(f), value: f })));
    // console.log('Filled count:', fields.filter(isValid).length);
    const total = fields.length;
    const filled = fields.filter(isValid).length;
    const percentage = Math.round((filled / total) * 100);
    // console.log('FINAL %:', percentage);
    // console.log('==============================');
    return percentage;
  };

  // static async createOutfitCollage(imageUrls) {
  //   if (!imageUrls || imageUrls.length === 0) return null;

  //   try {
  //     const axios = (await import('axios')).default;

  //     const imageBuffers = [];
  //     for (const url of imageUrls) {
  //       try {
  //         const response = await axios.get(url, { responseType: 'arraybuffer' });
  //         imageBuffers.push(Buffer.from(response.data));
  //       } catch (e) {
  //         console.log("Image download failed for collage:", url);
  //       }
  //     }

  //     if (imageBuffers.length === 0) return null;

  //     // 2. Collage settings
  //     const collageSize = 1024;
  //     const tileCount = Math.min(imageBuffers.length, 4);
  //     const cols = tileCount > 2 ? 2 : tileCount;
  //     const rows = tileCount > 1 ? Math.ceil(tileCount / cols) : 1;
  //     const tileWidth = Math.floor(collageSize / cols);
  //     const tileHeight = Math.floor(collageSize / rows);


  //     const processedImages = [];
  //     for (let i = 0; i < tileCount; i++) {
  //       // --- CHNAGE YAHAN HAI: contain use kiya cover ke bajaye ---
  //       const resized = await sharp(imageBuffers[i])
  //         .resize(tileWidth, tileHeight, {
  //           fit: 'contain', // Poore item ko contain karega cutout ke bajaye
  //           background: { r: 255, g: 255, b: 255, alpha: 1 } // Background ko poora white kar dega
  //         })
  //         .toBuffer();

  //       processedImages.push({
  //         input: resized,
  //         top: Math.floor(i / cols) * tileHeight,
  //         left: (i % cols) * tileWidth,
  //       });
  //     }

  //     // 3. Save to uploads/items
  //     const filename = `outfit_${randomstring.generate(10)}.png`;
  //     const savePath = path.join(UPLOAD_FILE_PATH, 'items', filename);

  //     await sharp({
  //       create: {
  //         width: collageSize,
  //         height: collageSize,
  //         channels: 4,
  //         background: { r: 255, g: 255, b: 255, alpha: 1 },
  //       },
  //     })
  //       .composite(processedImages)
  //       .toFile(savePath);

  //     return filename;
  //   } catch (error) {
  //     console.error('Collage Error:', error);
  //     return null;
  //   }
  // }

  static async createOutfitCollage(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return null;

    try {
      const axios = (await import('axios')).default;
      const FormData = (await import('form-data')).default;

      const imageBuffers = [];
      for (const url of imageUrls) {
        try {
          // ✅ Step 1: Image download kar
          const response = await axios.get(url, { responseType: 'arraybuffer' });
          const originalBuffer = Buffer.from(response.data);

          // ✅ Step 2: Photoroom se background remove kar
          const formData = new FormData();
          formData.append("image_file", originalBuffer, { filename: "image.jpg" });

          const bgRemovedResponse = await axios.post(
            "https://sdk.photoroom.com/v1/segment",
            formData,
            {
              headers: {
                "x-api-key": process.env.PHOTOROOM_API_KEY,
                ...formData.getHeaders(),
              },
              responseType: "arraybuffer",
            }
          );

          imageBuffers.push(Buffer.from(bgRemovedResponse.data));

        } catch (e) {
          console.log("Image download/bg-remove failed for collage:", url);
        }
      }

      if (imageBuffers.length === 0) return null;

      // ✅ Step 3: Collage settings
      const collageSize = 1024;
      const tileCount = Math.min(imageBuffers.length, 4);
      const cols = tileCount > 2 ? 2 : tileCount;
      const rows = tileCount > 1 ? Math.ceil(tileCount / cols) : 1;
      const tileWidth = Math.floor(collageSize / cols);
      const tileHeight = Math.floor(collageSize / rows);

      const processedImages = [];
      for (let i = 0; i < tileCount; i++) {
        const resized = await sharp(imageBuffers[i])
          .resize(tileWidth, tileHeight, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 } // ✅ transparent background
          })
          .toBuffer();

        processedImages.push({
          input: resized,
          top: Math.floor(i / cols) * tileHeight,
          left: (i % cols) * tileWidth,
        });
      }

      // ✅ Step 4: Save to uploads/items
      const filename = `outfit_${randomstring.generate(10)}.png`;
      const savePath = path.join(UPLOAD_FILE_PATH, 'items', filename);

      await sharp({
        create: {
          width: collageSize,
          height: collageSize,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // ✅ white background collage ka
        },
      })
        .composite(processedImages)
        .toFile(savePath);

      return filename;

    } catch (error) {
      console.error('Collage Error:', error);
      return null;
    }
  }

  static async removeBackgroundPhotoroomAndReturnUrl(file) {
    const { UPLOAD_FILE_PATH, FILES_URL } = await import("../global-variable.js");

    const outputDir = path.join(UPLOAD_FILE_PATH, 'remove_bg');
    fs.mkdirSync(outputDir, { recursive: true });

    const fileName = slugify(file.name.slice(0, file.name.indexOf(".")), "_") + Date.now() + ".png";
    const tempDir = path.join(UPLOAD_FILE_PATH, 'temp_bg_removal');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, fileName);

    await file.mv(tempPath);

    try {
      const formData = new FormData();
      formData.append("image_file", fs.createReadStream(tempPath));

      const response = await axios.post(
        "https://sdk.photoroom.com/v1/segment",
        formData,
        {
          headers: {
            "x-api-key": process.env.PHOTOROOM_API_KEY,
            ...formData.getHeaders(),
          },
          responseType: "arraybuffer",
        }
      );

      fs.unlinkSync(tempPath);

      const buffer = Buffer.from(response.data);
      const outputPath = path.join(outputDir, fileName);
      fs.writeFileSync(outputPath, buffer);

      return FILES_URL + "remove_bg/" + fileName;
    } catch (err) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw err;
    }
  }
}

export default GlobalFunctions;
