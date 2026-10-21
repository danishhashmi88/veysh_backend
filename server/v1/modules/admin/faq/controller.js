import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { MESSAGE } from "../../../../../global-variable.js";

// models
import Modal from "../../../../../models/faq.js";

const FaqController = {
    // save: (req, res) => {
    //     const {
    //         title,
    //         description,
    //     } = req.body;
    //     const createdBy = req.user._id;
    //     const record = new Modal({
    //         title: global.capitalizeFirstLetter(title),
    //         description,
    //     });
    //     record
    //         .save()
    //         .then(() => {
    //             return global.successResponse(res, global.msg(req, res, "faq_added"));
    //         })
    //         .catch((err) => {
    //             return global.failResponse(res, err.message, err);
    //         });
    // },

    save: (req, res) => {
        const {
            title,
            description,
            type,
        } = req.body;
        const createdBy = req.user._id;

        const formattedTitle = global.capitalizeFirstLetter(title);

        Modal.findOne({ title: formattedTitle })
            .then((existing) => {
                if (existing) {
                    return global.failResponse(res, "FAQ is already exists with this title.");
                }

                const record = new Modal({
                    title: formattedTitle,
                    description,
                    type,
                    createdBy,
                });

                return record.save().then(() => {
                    return global.successResponse(res, global.msg(req, res, "faq_added"));
                });
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    /**This function is used to get details */
    details: (req, res) => {
        const { o_id } = req.query;
        const json = { _id: new ObjectId(o_id) };
        Modal.aggregate([
            { $match: json },
            global.userDataQuery("createdBy", "createdBy"),
            global.userDataQuery("updatedBy", "updatedBy"),
            {
                $project: {
                    title: 1,
                    status: 1,
                    updatedAt: 1,
                    createdAt: 1,
                    description: 1,
                    type: 1,
                    createdBy: { $arrayElemAt: ["$createdBy", 0] },
                    updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
                },
            },
        ])
            .exec()
            .then(function (result) {
                if (result.length > 0) {
                    return global.successResponse(res, MESSAGE.OPR_SUCCESS, result[0]);
                } else {
                    return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
                }
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    /**This function is used to edit template */
    // edit: (req, res) => {
    //     const {
    //         o_id,
    //         title,
    //         description,
    //     } = req.body;
    //     const recordId = new ObjectId(o_id);
    //     const { _id } = req.user;
    //     const updateData = {
    //         title: global.capitalizeFirstLetter(title),
    //         description,
    //     };
    //     /** Saving data */
    //     Modal.updateOne(
    //         {
    //             _id: recordId,
    //         },
    //         { $set: updateData }
    //     )
    //         .then((result) => {
    //             return global.successResponse(res, global.msg(req, res, "faq_updated"), result);
    //         })
    //         .catch((err) => {
    //             return global.failResponse(res, err.message, err);
    //         });
    // },

    edit: (req, res) => {
        const {
            o_id,
            title,
            description,
            type,
        } = req.body;
        const recordId = new ObjectId(o_id);
        const { _id } = req.user;

        const formattedTitle = global.capitalizeFirstLetter(title);

        // Check if title exists in any OTHER record (excluding current one)
        Modal.findOne({ title: formattedTitle, _id: { $ne: recordId } })
            .then((existing) => {
                if (existing) {
                    return global.failResponse(res, "FAQ is already exists with this title.");
                }

                const updateData = {
                    title: formattedTitle,
                    description,
                    type,
                };

                return Modal.updateOne(
                    { _id: recordId },
                    { $set: updateData }
                ).then((result) => {
                    return global.successResponse(res, global.msg(req, res, "faq_updated"), result);
                });
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    /**This function is used to get list of faq */
    list: async (req, res) => {

        const globalSearch = ["title"];
        const page = Number(req.body.page) || 1;
        let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
        const skip = perPage * page - perPage;
        let json = {
            ...global.getSearching(req, globalSearch),
            ...global.getFilter(req),
        };
        let sorting = await global.getSorting(req);
        async.parallel(
            {
                list: (callback) => {
                    Modal.aggregate([
                        { $match: json },
                        { $sort: sorting },
                        { $skip: skip },
                        { $limit: perPage },
                        global.userDataQuery("updatedBy", "updatedBy"),
                        global.userDataQuery("createdBy", "createdBy"),
                        {
                            $project: {
                                title: 1,
                                status: 1,
                                updatedAt: 1,
                                createdAt: 1,
                                description: 1,
                                type: 1,
                                createdBy: { $arrayElemAt: ["$createdBy", 0] },
                                updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
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
                total_records: (callback) => {
                    Modal.countDocuments(json).then(function (result) {
                        callback(null, result);
                    }).catch((err) => {
                        callback(null, err);
                    });
                },
                data_ids: (callback) => {
                    Modal.aggregate([{ $match: json }, { $project: { _id: 1 } }])
                        .exec()
                        .then(function (result) {
                            callback(
                                null,
                                result.map((item) => item._id)
                            );
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
                    return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
                } else {
                    return global.failResponse(res, err.message, err);
                }
            }
        );
    },

    changeStatus: (req, res) => {
        const { o_id, status } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = { _id: { $in: ids } };
        Modal.updateMany(findJson, { $set: { status: status } })
            .then((result) => {
                return global.successResponse(res, global.msg(req, res, "msg_status_changed_successfully"));
            })
            .catch((err) => {
                return global.failResponse(res, err.message, JSON.stringify(err));
            });
    },

    delete: (req, res) => {
        const { o_id } = req.query;
        let ids = [new ObjectId(o_id)];
        let findJson = { _id: { $in: ids } };
        Modal.deleteMany(findJson)
            .then((deleted) => {
                return global.successResponse(res, global.msg(req, res, "faq_deleted"), {});
            })
            .catch((error) => {
                return global.failResponse(res, error.message, error);
            });
    },
}


export default FaqController;