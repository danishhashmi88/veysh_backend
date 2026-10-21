import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import async from "async";
import path from "path";
import fs from "fs";
import global from "../../../../../helpers/global-functions.js";
import User from "../../../../../models/users.js";
import globalSettings from "../../../../../models/global-settings.js";
import MessagesModel from "../../../../../models/messages.js";
import mongoose from "mongoose";
import { check } from "express-validator";
const ObjectId = mongoose.Types.ObjectId;
import { UPLOAD_FILE_PATH, ADMIN_OTP_DIGITS, FILES_URL, PER_PAGE_RECORDS, MESSAGE } from "../../../../../global-variable.js";
import axios from "axios";
import FormData from 'form-data';

const userController = {
    save: async (req, res) => {
        const {
            restaurant_name,
            email,
            address,
            phone_number,
            cuisine_type
        } = req.body;
        const createdBy = req.user._id;
        const phoneNumber = phone_number;

        try {
            // Fetch the last_rest_id and generate password in parallel
            const [globalSettingsData] = await Promise.all([
                globalSettings.findOne({}),
            ]);

            const restID = globalSettingsData ? globalSettingsData.last_rest_id + 1 : 100000;

            // Hash the password and handle file upload in parallel
            const [imageName] = await Promise.all([
                req.files && req.files.restaurant_logo ? global.uploadFile(req, "restaurant_logo", "users") : Promise.resolve(null)
            ]);

            let insertData = {
                id: restID,
                restaurant_name: global.capitalizeFirstLetter(restaurant_name),
                email: email.trim().toLowerCase(),
                phone_number: phoneNumber,
                address: address,
                createdBy,
                role: USER_ROLES.RESTAURANT,
                cuisine_type: cuisine_type.replaceAll("_", " "),
                featured: false,
            };

            if (imageName) {
                insertData.restaurant_logo = imageName;
            }

            // Save user record and update last_rest_id in global settings in parallel
            await Promise.all([
                (new User(insertData)).save(),
                globalSettings.updateOne({}, { $set: { last_rest_id: restID } })
            ]);

            return global.successResponse(res, global.msgByReq(req, "rest_added_successfully"));
        } catch (err) {
            // Handle errors
            global.failResponse(res, err.message, err);
        }
    },


    editUser: async (req, res) => {
        const {
            o_id,
            name,
            restaurant_name,
            phone_number,
            email,
            address,
            cuisine_type
        } = req.body;
        const { _id } = req.user;
        const findJson = { _id: new ObjectId(o_id) };

        let updateData = {
            name: global.capitalizeFirstLetter(name),
            restaurant_name: restaurant_name,
            phone_number,
            email: email.trim().toLowerCase(),
            address: address,
            cuisine_type,
            updatedBy: _id
        };
        // if (middle_name) {
        //     updateData.middle_name = global.capitalizeFirstLetter(middle_name);
        //     updateData.name =
        //         updateData.first_name +
        //         " " +
        //         updateData.middle_name +
        //         " " +
        //         updateData.last_name;
        // } else {
        //     updateData.name =
        //         updateData.first_name + " " + updateData.last_name;
        // }
        User.findOne(findJson)
            .then((userData) => {
                global
                    .uploadFile(req, "restaurant_logo", "users")
                    .then(async (imageName) => {
                        if (imageName) {
                            updateData.restaurant_logo = imageName;
                            const oldImagePath =
                                UPLOAD_FILE_PATH +
                                "users/" +
                                userData.restaurant_logo;
                            await global.removeFiles(oldImagePath);
                        }
                        User.updateOne(findJson, { $set: updateData })
                            // return res.status(200).json({ success: true, message: "Restaurant updated" });
                            .then(async () => {
                                let options = {
                                    slug: "user_account_changed",
                                    dynamicStrings: {
                                        ...(await global.getUserDynamicStrings(
                                            findJson
                                        )),
                                    },
                                };
                                let optionsNotes = {
                                    slug: "notes_assigned",
                                    dynamicStrings: {
                                        ...(await global.getUserDynamicStrings(
                                            findJson
                                        )),
                                    },
                                };
                                return global.successResponse(
                                    res,
                                    global.msgByReq(req, "restaurant_updated_successfully")
                                );
                            })
                            .catch((err) => {
                                return global.failResponse(
                                    res,
                                    err.message,
                                    err
                                );
                            });
                    })
                    .catch((err) => {
                        return global.failResponse(
                            res,
                            global.msg(req, res, global.msg(req, res, "err_in_upload_image")),
                            err
                        );
                    });
            })
            .catch((err) => {
                return global.failResponse(res, global.msg(req, res, "err_in_update_details"), err);
            });
    } /** Ends editProfile */,

    editProfile: (req, res) => {
        const { email, first_name, last_name, middle_name, phone_number } =
            req.body;
        const { _id, profile_image } = req.user;
        const findJson = {
            _id: new ObjectId(_id),
        };
        let updateData = {
            email: email.toLowerCase(),
            first_name: global.capitalizeFirstLetter(first_name),
            last_name: global.capitalizeFirstLetter(last_name),
            middle_name: null,
        };
        try {
            updateData.phone_number = phone_number;
        } catch (err) {
            updateData.phone_number = null;
        }

        if (middle_name) {
            updateData.middle_name = global.capitalizeFirstLetter(middle_name);
            updateData.name =
                updateData.first_name +
                " " +
                updateData.middle_name +
                " " +
                updateData.last_name;
        } else {
            updateData.name =
                updateData.first_name + " " + updateData.last_name;
        }
        global
            .uploadFile(req, "image", "users")
            .then(async (imageName) => {
                if (imageName) {
                    updateData.profile_image = imageName;
                    const oldImagePath =
                        UPLOAD_FILE_PATH + "users/" + profile_image;
                    await global.removeFiles(oldImagePath);
                }
                User.updateOne(findJson, {
                    $set: updateData,
                })
                    .then(async () => {
                        return global.successResponse(
                            res,
                            global.msgByReq(req, "profile_updated"),
                            await global.getUserData(_id)
                        );
                    })
                    .catch((err) => {

                        return global.failResponse(res, err.message, err);
                    });
            })
            .catch((err) => {
                return global.failResponse(res, global.msg(req, res, "err_in_upload_image"), err);
            });
    } /** Ends editProfile */,


    /**This function is used to get list of events */
    list: async (req, res) => {
        const globalSearch = ["restaurant_name", "email"];
        const page = Number(req.body.page) || 1;
        let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
        const skip = perPage * page - perPage;
        let json = {
            ...global.getSearching(req, globalSearch),
            ...global.getFilter(req),
            role: USER_ROLES.RESTAURANT,
        };
        if (ObjectId.isValid(req.body.distribution_id)) {
            let existsUsers = await DistributionUsersModal.find({
                distribution_id: new ObjectId(req.body.distribution_id),
            });
            json._id = { $in: existsUsers.map((user) => user.user_id) };
        }
        let sorting = await global.getSorting(req);
        async.parallel(
            {
                list: (callback) => {
                    User.aggregate([
                        { $match: json },
                        { $sort: sorting },
                        { $skip: skip },
                        { $limit: perPage },
                        global.userDataQuery("updatedBy", "updatedBy"),
                        global.userDataQuery("createdBy", "createdBy"),
                        {
                            $lookup: {
                                from: "rest-enrolls",
                                let: { recordId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [{ $eq: ["$restaurant_id", "$$recordId"] }],
                                            },
                                        },
                                    },
                                    {
                                        $project: {
                                            expiry_date: 1,
                                            plan_name: 1
                                        },
                                    }
                                ],
                                as: "enrollment_details",
                            },
                        },

                        {
                            $project: {
                                title: 1,
                                name: 1,
                                email: 1,
                                gender: 1,
                                role: 1,
                                status: 1,
                                phone_number: 1,
                                phone_number_work: 1,
                                last_name: 1,
                                createdAt: 1,
                                first_name: 1,
                                middle_name: 1,
                                subscribed_for_newsletter: 1,
                                restaurant_logo: global.userImageQueryLogo("restaurant_logo"),
                                createdBy: { $arrayElemAt: ["$createdBy", 0] },
                                updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
                                enrollment_details: {
                                    $cond: {
                                        if: { $gt: [{ $size: "$enrollment_details" }, 0] },
                                        then: { $arrayElemAt: ["$enrollment_details", 0] },
                                        else: null
                                    }
                                },
                                // enrollment_details : { $arrayElemAt: ["$enrollment_details", 0] },
                                address: 1,
                                restaurant_name: 1,
                                cuisine_type: 1,
                                featured: 1,
                                restaurent_info: {
                                    expiry_date: 1,
                                    plan_name: 1
                                }
                            },
                        },
                    ])
                        .exec()
                        .then(function (result) {
                            result.forEach(item => {
                                if (item.enrollment_details && item.enrollment_details !== null) {
                                    let info = item.enrollment_details
                                    info.days_in_expiry = global.calculateDaysInExpiry(info.expiry_date);
                                }
                            });
                            callback(null, result);
                        })
                        .catch((err) => {
                            callback(null, err);
                        });
                },
                total_records: (callback) => {
                    User.count(json)
                        .then(function (result) {
                            callback(null, result);
                        })
                        .catch((err) => {
                            callback(null, err);
                        });
                },
                page: (callback) => {
                    callback(null, page);
                },
                offset: (callback) => {
                    callback(null, skip);
                },
                per_page: (callback) => {
                    callback(null, perPage);
                },
            },
            (err, result) => {
                if (!err) {
                    return global.successResponse(
                        res,
                        global.msg(req, res, MESSAGE.OPR_SUCCESS),
                        result
                    );
                } else {
                    return global.failResponse(
                        res,
                        global.msg(req, res, MESSAGE.SOMETHING_WENT_WRONG),
                        err
                    );
                }
            }
        );
    },

    /**This function is used to get listByIds */
    listByIds: async (req, res) => {
        let ids = JSON.parse(req.body.o_id);
        ids = ids.map((id) => new ObjectId(id));
        let json = {
            // role: USER_ROLES.SUPER_ADMIN,
            _id: { $in: ids },
        };
        async.parallel(
            {
                list: (callback) => {
                    User.aggregate([
                        { $match: json },
                        {
                            $project: {
                                title: 1,
                                name: 1,
                                email: 1,
                                gender: 1,
                                lastname: "$last_name",
                                createdAt: 1,
                                firstname: "$first_name",
                                middlename: "$middle_name",
                                notes: 1,
                                fcm_token: 1,
                            },
                        },
                    ])
                        .exec()
                        .then(function (result) {
                            callback(null, result);
                        })
                        .catch((err) => {
                            callback(null, err);
                        });
                },
            },
            (err, result) => {
                if (!err) {
                    return global.successResponse(
                        res,
                        global.msg(req, res, MESSAGE.OPR_SUCCESS),
                        result
                    );
                } else {
                    return global.failResponse(
                        res,
                        global.msg(req, res, MESSAGE.SOMETHING_WENT_WRONG),
                        err
                    );
                }
            }
        );
    },

    /**This function is used to get edit */
    details: (req, res) => {
        const { o_id } = req.query;
        const json = { _id: new ObjectId(o_id) };
        User.aggregate([
            { $match: json },
            global.userDataQuery("createdBy", "createdBy"),
            global.userDataQuery("updatedBy", "updatedBy"),
            {
                $project: {
                    id: 1,
                    name: 1,
                    role: 1,
                    title: 1,
                    email: 1,
                    status: 1,
                    last_name: 1,
                    first_name: 1,
                    middle_name: 1,
                    gender: 1,
                    phone_number: 1,
                    phone_number_work: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    middle_name: 1,
                    restaurant_logo: global.userImageQueryLogo("restaurant_logo"),
                    createdBy: { $arrayElemAt: ["$createdBy", 0] },
                    updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
                    notes: 1,
                    extra_info: 1,
                    event_function: 1,
                    restaurant_name: 1,
                    address: 1,
                    cuisine_type: 1,
                },
            },
        ])
            .exec()
            .then(function (result) {
                if (result.length > 0) {
                    return global.successResponse(
                        res,
                        global.msg(req, res, MESSAGE.OPR_SUCCESS),
                        result[0]
                    );
                } else {
                    return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {});
                }
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    /**This function is used to change status of user */
    changeStatus: (req, res) => {
        const { o_id, status } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = { _id: { $in: ids } };
        User.updateMany(findJson, { $set: { status: status } })
            .then(async (result) => {
                let users = await User.find({
                    _id: { $in: ids },
                });
                let dynamicOptions = {
                    status: status == ACTIVE ? "activated" : "deactivated",
                };
                /**sending email of change status of user by admin*/
                // let allLogs = await global.prepareLogs({
                //     records: users,
                //     email_slug: "user_status",
                //     dynamicOptions: dynamicOptions,
                // });
                // let insertedLogs = await EmailLogsModal.insertMany(allLogs);
                // await global.setEmailQueue(insertedLogs);
                return global.successResponse(res, global.msg(req, res, MESSAGE.STATUS_CHANGE));
            })
            .catch((err) => {
                return global.failResponse(
                    res,
                    err.message,
                    JSON.stringify(err)
                );
            });
    },


    delete: async (req, res) => {
        try {
            const { o_id } = req.body;
            const ids = JSON.parse(o_id);

            const findJson = { _id: { $in: ids } };

            // Fetch users
            const users = await User.find(findJson);
            if (!users.length) {
                return global.failResponse(res, "No users found with the given IDs.");
            }

            // Prepare file paths for deletion
            const filePaths = users.map(record => UPLOAD_FILE_PATH + "users/" + record.profile_image);

            // Remove files
            await global.removeFiles(filePaths);

            // Delete users
            await User.deleteMany(findJson);

            // Send success response
            return global.successResponse(res, global.msg(req, res, MESSAGE.DELETED), {});
        } catch (error) {
            return global.failResponse(res, error.message, error);
        }
    },

    assignMedia: async (req, res) => {
        const { media, o_id, deleted_files } = req.body;
        let deletedFiles = [];
        let parsedMedia = [];
        try {
            deletedFiles = JSON.parse(deleted_files);
        } catch (err) { }
        try {
            parsedMedia = JSON.parse(media);
        } catch (err) { }
        if (deletedFiles && deletedFiles.length) {
            await SharedMediaModel.deleteMany({
                user_id: new ObjectId(o_id),
                file_path: { $in: deletedFiles },
            });
        }
        let json = {
            user_id: new ObjectId(o_id),
            file_path: { $in: parsedMedia },
        };
        let alreadyExistsData = await SharedMediaModel.find(json);
        let alreadyExistsDataUrls = alreadyExistsData.map((item) => {
            return item.file_path;
        });
        let userData = await User.findOne({ _id: new ObjectId(o_id) });
        let name = userData.name;
        parsedMedia = parsedMedia.filter((item) => {
            return alreadyExistsDataUrls.indexOf(item) == -1;
        });
        let files = [];
        try {
            const handleFiles = new Promise((resolve, reject) => {
                const mediaList = Array.isArray(parsedMedia) ? parsedMedia : [];
                const lastIndex = mediaList.length - 1;
                if (mediaList.length) {
                    mediaList.forEach((url, index) => {
                        let fileName = path.basename(url);
                        let folderArray = url.split("uploads");
                        let parentFolder = folderArray[1]
                            .replace(fileName, "")
                            .replace("/", "");
                        let filePath =
                            UPLOAD_FILE_PATH + parentFolder + fileName;
                        if (fs.existsSync(filePath)) {
                            let stats = fs.statSync(filePath);
                            /** Extract file extension */
                            let fileType =
                                path.extname(fileName).replace(".", "") ||
                                "Unknown";
                            files.push({
                                user_id: new ObjectId(o_id),
                                file_path:
                                    "/uploads/" + parentFolder + fileName,
                                file_size: stats.size,
                                file_name: fileName,
                                file_type: fileType,
                            });
                        }
                        if (index == lastIndex) {
                            resolve(files);
                        }
                    });
                } else {
                    resolve(files);
                }
            });
            const handleSave = new Promise((resolve, reject) => {
                if (files && files.length) {
                    SharedMediaModel.insertMany(files)
                        .then(() => {
                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
                } else {
                    resolve();
                }
            });
            handleFiles.then(() => {
                handleSave
                    .then(async () => {
                        let options = {
                            slug: "assign_media",
                            dynamicStrings: {
                                ...(await global.getUserDynamicStrings({
                                    _id: new ObjectId(o_id),
                                })),
                            },
                        };
                        global
                            .attachEmailTemplate(options)
                            .then((template) => {
                                global
                                    .sendEmail(
                                        template.subject,
                                        userData.email,
                                        template.body,
                                        {
                                            name: name,
                                            email_slug: options.slug,
                                        }
                                    )
                                    .then((mailData) => {
                                        return global.successResponse(
                                            res,
                                            global.msg(
                                                req,
                                                res,
                                                "admin_assign_media_assigned"
                                            )
                                        );
                                    })
                                    .catch((mailErr) => {
                                        global.failResponse(
                                            res,
                                            "Email not send",
                                            mailErr
                                        );
                                    });
                            })
                            .catch((err) => {
                                return global.failResponse(
                                    res,
                                    err.message,
                                    err
                                );
                            });
                    })
                    .catch((err) => {
                        return global.failResponse(res, err.message, err);
                    });
            });
        } catch (err) {
            console.error(err);
            return global.failResponse(
                res,
                "Error retrieving user media list.",
                err
            );
        }
    },

    FeaturedStatus: (req, res) => {
        const { o_id, featured } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = { _id: { $in: ids } };
        User.updateMany(findJson, { $set: { featured: featured } })
            .then(async (result) => {
                let responseMsg = featured.toString() === "true" ? "marked_featured" : "unmarked_featured";

                return global.successResponse(res, global.msgByReq(req, responseMsg))
            })
            .catch((err) => {
                return global.failResponse(
                    res,
                    err.message,
                    JSON.stringify(err)
                );
            });
    },


    changePassword: (req, res) => {
        const { current_password, new_password, confirm_newpassword } =
            req.body;
        const { _id, password, role, name } = req.user;
        const findJson = { _id: new ObjectId(_id) };
        /**verify current password*/
        bcrypt
            .compare(current_password, password)
            .then(async (passwordMatch) => {
                if (passwordMatch) {
                    let updateData = {
                        /**Hashing the new password*/
                        password: await global.incPassword(new_password),
                    };
                    User.updateOne(findJson, { $set: updateData })
                        .then(async () => {
                            return global.successResponse(
                                res,
                                "Password changed successfully",
                                {}
                            );
                        })
                        .catch((err) => {
                            return global.failResponse(res, err.message, err);
                        });
                } else {
                    return global.failResponse(
                        res,
                        "Invalid current password",
                        {}
                    );
                }
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    chatList: async (req, res) => {
        try {
            const user_id = req.body.user_id;
            const page = Number(req.body.page) || 1;
            const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
            const skip = perPage * page - perPage;
            const match = {
                $or: [
                    { sender_id: new ObjectId(user_id) },
                    { receiver_id: new ObjectId(user_id) },
                ],
            };
            const roomsAgg = await MessagesModel.aggregate([
                { $match: match },
                { $sort: { createdAt: -1 } },
                { $group: { _id: "$room", lastDoc: { $first: "$$ROOT" } } },
                { $sort: { "lastDoc.createdAt": -1 } },
                { $skip: skip },
                { $limit: perPage },
                {
                    $lookup: {
                        from: "users",
                        localField: "lastDoc.sender_id",
                        foreignField: "_id",
                        as: "sender",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "lastDoc.receiver_id",
                        foreignField: "_id",
                        as: "receiver",
                    },
                },
                { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$receiver", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        room: "$_id",
                        last_message: "$lastDoc",
                        my_receiver_id: {
                            $cond: {
                                if: { $eq: ["$lastDoc.sender_id", new ObjectId(user_id)] },
                                then: "$lastDoc.receiver_id",
                                else: "$lastDoc.sender_id",
                            },
                        },
                        receiver_data: {
                            $cond: {
                                if: { $eq: ["$lastDoc.sender_id", new ObjectId(user_id)] },
                                then: "$receiver",
                                else: "$sender",
                            },
                        },
                    },
                },
            ]);
            const total_records = await MessagesModel.distinct("room", match).then((r) => r.length);
            const list = roomsAgg.map((row) => {
                const last = row.last_message || {};
                return {
                    room: row.room,
                    my_receiver_id: row.my_receiver_id,
                    last_message: {
                        ...last,
                        file_url: last.file_name ? FILES_URL + "chat/" + last.file_name : null,
                    },
                    receiver_data: row.receiver_data,
                };
            });
            return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
                list,
                total_records,
                page,
                offset: skip,
                per_page: perPage,
            });
        } catch (err) {
            return global.failResponse(res, err.message, err);
        }
    },

    getMessages: async (req, res) => {
        try {
            const { room } = req.query;
            if (!room) {
                return global.failResponse(res, MESSAGE.INVALID_REQUEST, {});
            }
            const list = await MessagesModel.aggregate([
                { $match: { room } },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "users",
                        localField: "sender_id",
                        foreignField: "_id",
                        as: "sender",
                    },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "receiver_id",
                        foreignField: "_id",
                        as: "receiver",
                    },
                },
                { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
                { $unwind: { path: "$receiver", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        room: 1,
                        sender_id: 1,
                        receiver_id: 1,
                        message: 1,
                        file_name: 1,
                        type: 1,
                        createdAt: 1,
                        "sender.name": 1,
                        "sender.first_name": 1,
                        "sender.email": 1,
                        "receiver.name": 1,
                        "receiver.first_name": 1,
                        "receiver.email": 1,
                    },
                },
            ]);
            const listWithUrl = list.map((doc) => ({
                ...doc,
                file_url: doc.file_name ? FILES_URL + "chat/" + doc.file_name : null,
            }));
            return global.successResponse(res, MESSAGE.OPR_SUCCESS, listWithUrl);
        } catch (err) {
            return global.failResponse(res, err.message, err);
        }
    },

    messagesDelete: async (req, res) => {
        try {
            const o_id = req.body.o_id;
            if (!o_id || !ObjectId.isValid(o_id)) {
                return global.failResponse(res, MESSAGE.INVALID_REQUEST, {});
            }
            await MessagesModel.deleteOne({ _id: new ObjectId(o_id) });
            return global.successResponse(res, MESSAGE.DELETED, {});
        } catch (err) {
            return global.failResponse(res, err.message, err);
        }
    },

    removeBackground: async (req, res) => {
        try {
            if (!req.files || !req.files.image) {
                return global.failResponse(res, "Image is required", {});
            }

            // ✅ API key: frontend se aaye to use karo, warna static fallback
            const PICSART_API_KEY = req.body?.picsart_api_key?.trim() || "paat-jS3g2bEGw6YBu6cibfAvnKSLbSy";

            let savedImageName = null;
            try {
                savedImageName = await global.uploadFile(req, 'image', 'temp_bg_removal');
            } catch (uploadErr) {
                return global.failResponse(res, "Image upload failed: " + uploadErr.message, {});
            }

            if (!savedImageName) {
                return global.failResponse(res, "Image could not be saved", {});
            }

            const savedFilePath = path.join(UPLOAD_FILE_PATH, 'temp_bg_removal', savedImageName);

            const formData = new FormData();
            formData.append("image", fs.createReadStream(savedFilePath));
            formData.append("output_type", "cutout");
            formData.append("format", "PNG");

            // ✅ Processing time start
            const startTime = Date.now();

            const response = await axios.post(
                "https://api.picsart.io/tools/1.0/removebg",
                formData,
                {
                    headers: {
                        "accept": "application/json",
                        "X-Picsart-API-Key": PICSART_API_KEY,
                        ...formData.getHeaders(),
                    },
                }
            );

            // ✅ Processing time calculate
            const processingTimeMs = Date.now() - startTime;

            // Temp file cleanup
            fs.unlink(savedFilePath, (err) => {
                if (err) console.error("Temp file delete failed:", err.message);
            });

            const resultUrl = response.data?.data?.url;
            if (!resultUrl) {
                return global.failResponse(res, "Background removal failed: No URL in response", {});
            }

            // Picsart URL se image download karo
            const imageResponse = await axios.get(resultUrl, { responseType: "arraybuffer" });
            const buffer = Buffer.from(imageResponse.data);

            const outputFileName = `removebg_${Date.now()}.png`;
            const outputFilePath = path.join(UPLOAD_FILE_PATH, 'remove_bg', outputFileName);

            fs.mkdirSync(path.join(UPLOAD_FILE_PATH, 'remove_bg'), { recursive: true });
            fs.writeFileSync(outputFilePath, buffer);

            return global.successResponse(res, "Background removed successfully", {
                image: FILES_URL + "remove_bg/" + outputFileName,
                processing_time_ms: processingTimeMs,                        // e.g. 3200
                processing_time_sec: (processingTimeMs / 1000).toFixed(2),  // e.g. "3.20"
            });

        } catch (err) {
            console.error("Error Details:", err.message);

            let errorMessage = err.message;
            if (err.response && err.response.data) {
                try {
                    const errorData = typeof err.response.data === 'object'
                        ? err.response.data
                        : JSON.parse(Buffer.from(err.response.data).toString());
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    errorMessage = "API returned an error";
                }
            }

            return global.failResponse(res, "Background removal failed: " + errorMessage, {});
        }
    },

    removeBackgroundPoof: async (req, res) => {
        try {
            if (!req.files || !req.files.image) {
                return global.failResponse(res, "Image is required", {});
            }
            const POOF_API_KEY = req.body?.poof_api_key?.trim() || "pk_455b39419101582af68a0e9e925a1943";

            let savedImageName = null;
            try {
                savedImageName = await global.uploadFile(req, 'image', 'temp_bg_removal');
            } catch (uploadErr) {
                return global.failResponse(res, "Image upload failed: " + uploadErr.message, {});
            }

            if (!savedImageName) {
                return global.failResponse(res, "Image could not be saved", {});
            }

            const savedFilePath = path.join(UPLOAD_FILE_PATH, 'temp_bg_removal', savedImageName);

            const formData = new FormData();
            formData.append("image_file", fs.createReadStream(savedFilePath));
            formData.append("format", "png");
            formData.append("size", "full");

            const startTime = Date.now();

            const response = await axios.post(
                "https://api.poof.bg/v1/remove",
                formData,
                {
                    headers: {
                        "x-api-key": POOF_API_KEY,
                        ...formData.getHeaders(),
                    },
                    responseType: "arraybuffer",
                }
            );
            const processingTimeMs = Date.now() - startTime;

            fs.unlink(savedFilePath, (err) => {
                if (err) console.error("Temp file delete failed:", err.message);
            });

            const buffer = Buffer.from(response.data);

            const outputFileName = `removebg_${Date.now()}.png`;
            const outputDir = path.join(UPLOAD_FILE_PATH, 'remove_bg');
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(path.join(outputDir, outputFileName), buffer);

            return global.successResponse(res, "Background removed successfully", {
                image: FILES_URL + "remove_bg/" + outputFileName,
                processing_time_ms: processingTimeMs,
                processing_time_sec: (processingTimeMs / 1000).toFixed(2),
            });

        } catch (err) {
            console.error("Error Details:", err.message);

            let errorMessage = err.message;
            if (err.response && err.response.data) {
                try {
                    const errorData = JSON.parse(Buffer.from(err.response.data).toString());
                    errorMessage = errorData?.error?.message
                        || errorData?.errors?.[0]?.title
                        || errorMessage;
                } catch (e) {
                    errorMessage = "API returned an error";
                }
            }

            return global.failResponse(res, "Background removal failed: " + errorMessage, {});
        }
    },


    removeBackgroundPhotoroom: async (req, res) => {
        try {
            if (!req.files || !req.files.image) {
                return global.failResponse(res, "Image is required", {});
            }

            const PHOTOROOM_API_KEY = req.body?.photoroom_api_key?.trim()
                || "sk_pr_default_96bf55659ec4f89cfcd598577edd9d59bb618f57";

            let savedImageName = null;
            try {
                savedImageName = await global.uploadFile(req, 'image', 'temp_bg_removal');
            } catch (uploadErr) {
                return global.failResponse(res, "Image upload failed: " + uploadErr.message, {});
            }

            if (!savedImageName) {
                return global.failResponse(res, "Image could not be saved", {});
            }

            const savedFilePath = path.join(UPLOAD_FILE_PATH, 'temp_bg_removal', savedImageName);

            const formData = new FormData();
            formData.append("image_file", fs.createReadStream(savedFilePath));

            const startTime = Date.now();

            const response = await axios.post(
                "https://sdk.photoroom.com/v1/segment",
                formData,
                {
                    headers: {
                        "x-api-key": PHOTOROOM_API_KEY,
                        ...formData.getHeaders(),
                    },
                    responseType: "arraybuffer",
                }
            );

            const processingTimeMs = Date.now() - startTime;

            fs.unlink(savedFilePath, (err) => {
                if (err) console.error("Temp file delete failed:", err.message);
            });

            const buffer = Buffer.from(response.data);

            const outputFileName = `photoroom_${Date.now()}.png`;
            const outputDir = path.join(UPLOAD_FILE_PATH, 'remove_bg');
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(path.join(outputDir, outputFileName), buffer);

            return global.successResponse(res, "Background removed successfully", {
                image: FILES_URL + "remove_bg/" + outputFileName,
                processing_time_ms: processingTimeMs,
                processing_time_sec: (processingTimeMs / 1000).toFixed(2),
            });

        } catch (err) {
            console.error("Error Details:", err.message);

            let errorMessage = err.message;
            if (err.response && err.response.data) {
                try {
                    const errorData = JSON.parse(Buffer.from(err.response.data).toString());
                    errorMessage = errorData?.message
                        || errorData?.error
                        || errorData?.errors?.[0]?.title
                        || errorMessage;
                } catch (e) {
                    errorMessage = "API returned an error";
                }
            }

            return global.failResponse(res, "Background removal failed: " + errorMessage, {});
        }
    },

};


export default userController;