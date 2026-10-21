import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import async from "async";
import { UPLOADED_BANNERS_URL, UPLOAD_FILE_PATH,  MESSAGE } from "../../../../../global-variable.js";

// models
import Modal from "../../../../../models/banner.js";

const bannerController = {
    /**This function is used to add banner */
    save: (req, res) => {
        const { title, title_ja, link, description, description_ja } = req.body;
        const createdBy = req.user._id;
        let insertData = {
            title: global.capitalizeFirstLetter(title),
            title_ja: global.capitalizeFirstLetter(title_ja),
            link: link,
            description: description,
            description_ja: description_ja,
            createdBy: createdBy , 
            updatedBy : createdBy
        };
        /**Uploading file */
        global.uploadFile(req, 'image', 'banners').then((imageName) => {
            if (imageName) {
                insertData.image = imageName;
            }
            /**Saving data to database */
            const record = new Modal(insertData);
            record.save().then(term => {
                return global.successResponse(res, global.msgByReq(req,"data_added"));
            }).catch((err) => {
                return global.failResponse(res, err.message, err);
            });
        }).catch((err) => {
            return global.failResponse(res, err.message, err);
        });
    },

    /**This function is used to get details */
    details: (req, res) => {
        const { o_id } = req.query;
        if (!o_id) {
          return global.failResponse(res, "Missing o_id", null);
        }
        if (!ObjectId.isValid(o_id)) {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
        }
        const json = { _id: new ObjectId(o_id) };

        Modal.aggregate([
            { $match: json },
            global.userDataQuery("createdBy","createdBy"),
            global.userDataQuery("updatedBy","updatedBy"),
            {
                $project: {
                    link: 1,
                    title: 1,
                    status: 1,
                    title_ja: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    description: 1,
                    description_ja: 1,
                    image: { $concat: [UPLOADED_BANNERS_URL, '$image'] },
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

    /**This function is used to get list of events */
    list: async (req, res) => {
        const globalSearch = ['title'];
        const page = Number(req.body.page) || 1;
        let perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
        const skip = (perPage * page) - perPage;
        let json = {
            ...global.getSearching(req, globalSearch),
            ...global.getFilter(req)
        };
        let sorting = await global.getSorting(req);
        async.parallel({
            list: (callback) => {
                Modal.aggregate([
                    { $match: json },
                    { $sort: sorting },
                    { $skip: skip },
                    { $limit: perPage },
                    global.userDataQuery("updatedBy","updatedBy"),
                    global.userDataQuery("createdBy","createdBy"),
                    {
                        $project: {
                            link: 1,
                            title: 1,
                            title_ja: 1,
                            status: 1,
                            createdAt: 1,
                            description: 1,
                            description_ja: 1,
                            image: { $concat: [UPLOADED_BANNERS_URL, "$image"] },
                            createdBy: { $arrayElemAt: ["$createdBy", 0] },
                            updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
                        }
                    }
                ]).exec().then(function (result) {
                    callback(null, result);
                }).catch((err) => {
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
                Modal.aggregate([{ $match: json }, { $project: { _id: 1 } }]).exec().then(function (result) {
                    callback(null, result.map(item => item._id));
                }).catch((err) => {
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

        }, (err, result) => {
            if (!err) {
                return global.successResponse(res, MESSAGE.OPR_SUCCESS, result);
            } else {
                return global.failResponse(res, MESSAGE.SOMETHING_WENT_WRONG, err);
            }
        });
    },

    /**This function is used to edit banner */
    edit: (req, res) => {
        const { title, title_ja, o_id, link, description, description_ja } = req.body;
        const { _id } = req.user;

        let findJson = { _id: new ObjectId(o_id) };

        Modal.findOne(findJson).then((result) => {
            let updateData = {
                title: global.capitalizeFirstLetter(title),
                title_ja: global.capitalizeFirstLetter(title_ja),
                link: link,
                description: description,
                description_ja: description_ja,
                updatedBy: _id
            };
            /** Saving data */
            global.uploadFile(req, 'image', 'banners').then(async (imageName) => {
                if (imageName) {
                    updateData.image = imageName;
                    const oldImagePath = UPLOAD_FILE_PATH + "banners/" + result.image;
                    await global.removeFiles(oldImagePath);
                }
                Modal.updateOne(findJson, {
                    $set: updateData
                }).then(() => {
                    return global.successResponse(res, global.msgByReq(req,"data_updated"));
                }).catch((err) => {
                    return global.failResponse(res, err.message, err);
                });
            }).catch((err) => {
                return global.failResponse(res, err.message, err);
            });
        }).catch((err) => {
            return global.failResponse(res, err.message, err)
        });
    },

    /**This function is used to change status of banner */
    changeStatus: (req, res) => {
        const { o_id, status } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = { _id: { $in: ids } };
        Modal.updateMany(
            findJson,
            { $set: { status: status } }).then((result) => {
                return global.successResponse(res, global.msg(req,res,MESSAGE.STATUS_CHANGE));
            }).catch((err) => {
                return global.failResponse(res, err.message, JSON.stringify(err));
            });
    },

    /**This function is used to delete banner */
    delete: (req, res) => {
        const { o_id } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = { _id: { $in: ids } };
        Modal.find(findJson).then((records) => {
            let filePaths = records.map(record => UPLOAD_FILE_PATH + "banners/" + record.image);
            global.removeFiles(filePaths).then(() => {
                Modal.deleteMany(findJson).then((deleted) => {
                    return global.successResponse(res, global.msgByReq(req, "msg_deleted_successfully"), {});
                }).catch((error) => {
                    return global.failResponse(res, error.message, error);
                });
            }).catch((error) => {
                return global.failResponse(res, error.message, error);
            });
        }).catch((error) => {
            return global.failResponse(res, error.message, error);
        });
    },
}


export default bannerController;