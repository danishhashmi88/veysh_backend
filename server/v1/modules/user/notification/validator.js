import global from "../../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../../global-variable.js";
import { body, validationResult, query } from "express-validator/lib/index.js";
import UserModel from "../../../../../models/users.js";
import { PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";
import bcrypt from "bcrypt";

const notificationSettingValidator = {
    updateSettings: async (req, res, next) => {
        await global.validateBooleanField(
            req,
            'push.outfit_reminders',
            { required: false },
            { invalid: 'Push outfit_reminders must be boolean' }
        );

        await global.validateBooleanField(
            req,
            'push.likes_comments',
            { required: false },
            { invalid: 'Push likes_comments must be boolean' }
        );

        await global.validateBooleanField(
            req,
            'email.outfit_reminders',
            { required: false },
            { invalid: 'Email outfit_reminders must be boolean' }
        );

        await global.validateBooleanField(
            req,
            'email.likes_comments',
            { required: false },
            { invalid: 'Email likes_comments must be boolean' }
        );

        // await global.validateBooleanField(
        //     req,
        //     'sms.outfit_reminders',
        //     { required: false },
        //     { invalid: 'SMS outfit_reminders must be boolean' }
        // );

        // await global.validateBooleanField(
        //     req,
        //     'sms.likes_comments',
        //     { required: false },
        //     { invalid: 'SMS stylist_updates must be boolean' }
        // );

        let errors = validationResult(req).array({ onlyFirstError: true });

        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },


    // updateSpecificSetting: async (req, res, next) => {
    //     await param('type')
    //         .isIn(['push', 'email', 'sms'])
    //         .withMessage('Type must be push, email, or sms')
    //         .run(req);

    //     await param('setting')
    //         .isIn(['outfit_reminders', 'likes_comments'])
    //         .withMessage('Setting must be outfit_reminders or likes_comments')
    //         .run(req);

    //     await body('value')
    //         .isBoolean()
    //         .withMessage('Value must be boolean')
    //         .run(req);

    //     let errors = validationResult(req).array({ onlyFirstError: true });

    //     if (errors.length == 0) {
    //         next();
    //     } else {
    //         return global.failResponse(res, 'Invalid request', errors);
    //     }
    // }
};


export default notificationSettingValidator