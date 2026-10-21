const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";
import Modal from "../../../../../models/email-templates.js";
import { EMAIL_TEMPLATE_TYPES } from "../../../../../global-variable.js";
import { MESSAGE,ACTIVE } from "../../../../../global-variable.js";

/** Validations for email-templates's api */
const emailTempValidator = {
  save: async (req, res, next) => {
    await global.validateTextField(req, 'title', global.msg(req, res, 'admin_err_title_is_required'));
    await global.validateTextField(req, 'subject', global.msg(req, res, 'admin_err_subject_is_required'));
    await global.validateTextField(req, 'type', global.msg(req, res, 'admin_err_type_is_required'));
    await global.isExistsInVar(req, 'type', EMAIL_TEMPLATE_TYPES);
    if (req.body.type == EMAIL_TEMPLATE_TYPES.DEFAULT) {
      const slugValidation = body('slug')
        .trim()
        .not()
        .isEmpty()
        .withMessage('Slug is required')
        .custom(async (value) => {
          const findJson = {
            slug: value,
            status: ACTIVE,
          };
          const record = await Modal.findOne(findJson);
          if (record) {
            throw new Error('This slug already exists');
          }
          return true;
        });

      await slugValidation.run(req);
    }

    await global.validateTextField(req, 'description', global.msg(req, res, 'admin_err_description_is_required'));

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  details: async (req, res, next) => {
    await global.validateObjId(req, 'o_id', { findInDb: true, DBField: "_id", DB: Modal, query: true }, {
      required: global.msg(req, res, 'admin_err_o_id_is_required')
    });
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  edit: async (req, res, next) => {
    await global.validateObjId(req, 'o_id', { findInDb: true, DBField: "_id", DB: Modal }, {
      required: global.msg(req, res, 'admin_err_o_id_is_required')
    });
    await global.validateTextField(req, 'title', global.msg(req, res, 'admin_err_title_is_required'));
    await global.validateTextField(req, 'subject', global.msg(req, res, 'admin_err_subject_is_required'));
    if (req.body.type == EMAIL_TEMPLATE_TYPES.DEFAULT) {
      await body('slug')
        .trim()
        .not()
        .isEmpty()
        .withMessage('Slug is required')
        .custom(value => {
          const findJson = {
            slug: value,
            status: ACTIVE,
          };
          return Modal.findOne(findJson).then(record => {
            if (record) {
              return Promise.reject();
            } else {
              return Promise.resolve();
            }
          })
        })
        .withMessage('This slug is already exists.')
        .run(req);
    }
    await body('description')
      .trim()
      .not()
      .isEmpty()
      .withMessage('Description is required')
      .run(req);
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  changeStatus: async (req, res, next) => {
    await body('o_id').trim().not().isEmpty().withMessage(global.msg(req, res, 'admin_err_o_id_is_required')).custom((value) => {
      return new Promise((resolve, reject) => {
        try {
          let ids = JSON.parse(req.body.o_id);
          ids.forEach((id, i) => {
            if (ObjectId.isValid(id)) {
              if (i == (ids.length - 1)) {
                resolve();
              }
            } else {
              reject("Invalid id");
            }
          })
        } catch (err) {
          return reject("Invalid json of ids");
        }
      });
    }).run(req);
    await global.validateStatusField(req, 'status', global.msg(req, res, 'admin_err_status_is_required'));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  deleteRecord: async (req, res, next) => {
    await body('o_id').trim().not().isEmpty().withMessage(global.msg(req, res, 'admin_err_o_id_is_required')).custom((value) => {
      return new Promise((resolve, reject) => {
        try {
          let ids = JSON.parse(req.body.o_id);
          ids.forEach((id, i) => {
            if (ObjectId.isValid(id)) {
              if (i == (ids.length - 1)) {
                resolve();
              }
            } else {
              reject("Invalid id");
            }
          })
        } catch (err) {
          return reject("Invalid json of ids");
        }
      });
    }).run(req);

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  sendTestEmail: async (req, res, next) => {
    await global.validateEmailField(req, 'email', {}, { required: global.msg(req, res, 'admin_err_email_is_required') });
    await body('slug')
      .trim()
      .not()
      .isEmpty()
      .withMessage('Slug is required')
      .run(req);
    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default emailTempValidator;
