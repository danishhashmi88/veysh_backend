import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import async from "async";
import path from "path";
import fs from "fs";
import global from "../../../../../helpers/global-functions.js";
import User from "../../../../../models/users.js";
// import ObjectId from "mongoose";
import mongoose from 'mongoose';

const ObjectId = mongoose.Types.ObjectId;
import Testimonials from "../../../../../models/testimonials.js";
import { UPLOAD_FILE_PATH, MESSAGE } from "../../../../../global-variable.js";

const testimonialController = {
    save: async (req, res) => {
        const {
            name,
            address,
            testimonial_text,
            city,
            country , 
            rating
        } = req.body;
        const createdBy = req.user._id;

        let insertData = {
            name: global.capitalizeFirstLetter(name),
            address: address,
            testimonial_text: testimonial_text,
            city: global.capitalizeFirstLetter(city),
            country: global.capitalizeFirstLetter(country),
            createdBy: createdBy,
            rating : rating
        };

        global.uploadFile(req, "profile_image", "users").then((imageName) => {
            if (imageName) {
                insertData.profile_image = imageName;
            }
            /**Saving data to database */
            const record = new Testimonials(insertData);
            record
                .save()
                .then((term) => {
                    return global.successResponse(res, global.msg(req,res,MESSAGE.SAVED));
                })
                .catch((err) => {
                    return global.failResponse(res, err.message, err);
                })
                .catch((err) => {
                    return global.failResponse(res, err.message, err);
                });
        });
    },

    editUser: async (req, res) => {
        const {
            o_id,
            name,
            address,
            profile_image,
            testimonial_text,
            city,
            country,
            rating
        } = req.body;
        const {
            _id
        } = req.user;
        const findJson = {
            _id: new ObjectId(o_id),
        };
        let updateData = {
            name: global.capitalizeFirstLetter(name),
            address: global.capitalizeFirstLetter(address),
            testimonial_text: testimonial_text,
            city: global.capitalizeFirstLetter(city),
            country: global.capitalizeFirstLetter(country),
            updatedBy: _id,
            rating : rating
        };

        Testimonials.findOne(findJson)
            .then((userData) => {
                global
                    .uploadFile(req, "profile_image", "users")
                    .then(async (imageName) => {
                        if (imageName) {
                            updateData.profile_image = imageName;
                            if (userData.profile_image) {
                                const oldImagePath =
                                    UPLOAD_FILE_PATH +
                                    "users/" +
                                    userData.profile_image;
                                await global.removeFiles(oldImagePath);
                            }
                        }
                        if (
                            profile_image === false ||
                            profile_image === "false"
                        ) {
                            updateData.profile_image = null;
                            const oldImagePath =
                                UPLOAD_FILE_PATH +
                                "users/" +
                                userData.profile_image;
                            await global.removeFiles(oldImagePath);
                        }
                        // global
                        //     .uploadFile(req, "images", "users")
                        //     .then(async (images) => {
                        //         const deletedFiles = JSON.parse(
                        //             req.body.deletedFiles
                        //         );

                        //         let existingFiles = [
                        //             ...(userData.images ? userData.images : []),
                        //         ];
                        //         if (deletedFiles.length) {
                        //             existingFiles = existingFiles.filter(
                        //                 (item) => {
                        //                     return (
                        //                         deletedFiles.indexOf(
                        //                             `${process.env.BASE_URL}/uploads/users/` +
                        //                                 item
                        //                         ) == -1
                        //                     );
                        //                 }
                        //             );
                        //             const filePaths = deletedFiles.map(
                        //                 (item) => {
                        //                     let path = item.replace(
                        //                         `${process.env.BASE_URL}/uploads/`,
                        //                         ""
                        //                     );
                        //                     return UPLOAD_FILE_PATH + path;
                        //                 }
                        //             );
                        //             await global.removeFiles(filePaths);
                        //         }
                        //         // if (images) {
                        //         //     let files = Array.isArray(images)
                        //         //         ? [...existingFiles, ...images]
                        //         //         : [...existingFiles, images];
                        //         //     updateData.images = files;
                        //         // }

                        //         if (images) {
                        //             // Update existingFiles array with new images
                        //             existingFiles = Array.isArray(images)
                        //                 ? [...existingFiles, ...images]
                        //                 : [...existingFiles, images];
                        //         }

                        //         // Update the updateData object with the new image paths
                        //         updateData.images = existingFiles;

                        Testimonials.updateOne(findJson, {
                            $set: updateData,
                        })
                            .then(async () => {
                                return global.successResponse(
                                    res,
                                    global.msg(req,res,MESSAGE.EDITED)
                                );
                            })
                            .catch((err) => {
                                return global.failResponse(
                                    res,
                                    err.message,
                                    err
                                );
                            });
                    });
            })
            // .catch((err) => {
            //     return global.failResponse(
            //         res,
            //         "Error in upload image",
            //         err
            //     );
            // });
            // })
            .catch((err) => {
                return global.failResponse(res, "Error in upload image", err);
            });
    } /** Ends editProfile */,

    editProfile: (req, res) => {
        const {
            email,
            first_name,
            last_name,
            middle_name,
            phone_number
        } =
            req.body;
        const {
            _id,
            profile_image
        } = req.user;
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
            updateData.phone_number = JSON.parse(phone_number);
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
            .uploadFile(req, "profile_image", "users")
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
                            global.msg(req,res,MESSAGE.EDITED),
                            await global.getUserData(_id)
                        );
                    })
                    .catch((err) => {
                        return global.failResponse(res, err.message, err);
                    });
            })
            .catch((err) => {
                return global.failResponse(res, "Error in upload image", err);
            });
    } /** Ends editProfile */,

    changePassword: (req, res) => {
        const {
            current_password,
            new_password,
            confirm_newpassword
        } =
            req.body;
        const {
            _id,
            password,
            role,
            name
        } = req.user;
        const findJson = {
            _id: new ObjectId(_id)
        };
        /**verify current password*/
        bcrypt
            .compare(current_password, password)
            .then(async (passwordMatch) => {
                if (passwordMatch) {
                    let updateData = {
                        /**Hashing the new password*/
                        password: await global.incPassword(new_password),
                    };
                    User.updateOne(findJson, {
                        $set: updateData
                    })
                        .then(async () => {
                            return global.successResponse(
                                res,
                                "Password changed successfully", {}
                            );
                        })
                        .catch((err) => {
                            return global.failResponse(res, err.message, err);
                        });
                } else {
                    return global.failResponse(
                        res,
                        "Invalid current password", {}
                    );
                }
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    /**This function is used to get list of events */
   // Assuming this method is declared inside an async function (or you mark it “async”).
list: async (req, res) => {
  try {
    const globalSearch = ["name"];
    const page = Number(req.body.page) || 1;
    const perPage = Number(req.body.per_page) || PER_PAGE_RECORDS;
    const skip = perPage * (page - 1);

    const filterJson = {
      ...global.getSearching(req, globalSearch),
      ...global.getFilter(req),
    };

    if (req.body.distribution_id && ObjectId.isValid(req.body.distribution_id)) {
      const existsUsers = await DistributionUsersModal.find({
        distribution_id: new ObjectId(req.body.distribution_id),
      }).select("user_id");  // you only need user_id

      const userIds = existsUsers.map(u => u.user_id);
      filterJson._id = { $in: userIds };
    }

    const sorting = await global.getSorting(req);

    // Build the aggregate pipeline
    const pipeline = [
      { $match: filterJson },
      { $sort: sorting },
      { $skip: skip },
      { $limit: perPage },
      global.userDataQuery("updatedBy", "updatedBy"),
      global.userDataQuery("createdBy", "createdBy"),
      {
        $lookup: {
          from: "sharemedias",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user_id", "$$userId"] } } },
            { $project: { file_path: 1 } }
          ],
          as: "media"
        }
      },
      {
        $project: {
          name: 1,
          role: 1,
          status: 1,
          address: 1,
          createdAt: 1,
          testimonial_text: 1,
          review: 1,
          rating: 1,
          city: 1,
          country: 1,
          profile_image: global.userImageQuery(),
          createdBy: { $arrayElemAt: ["$createdBy", 0] },
          updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
          media: 1
        }
      }
    ];

    // Execute both queries in parallel
    const [listResult, totalRecords] = await Promise.all([
      Testimonials.aggregate(pipeline).exec(),
      Testimonials.countDocuments(filterJson)
    ]);

    const result = {
      list: listResult,
      total_records: totalRecords,
      page,
      offset: skip,
      per_page: perPage,
    };

    return global.successResponse(
      res,
      global.msg(req, res, MESSAGE.OPR_SUCCESS),
      result
    );

  } catch (err) {
    return global.failResponse(
      res,
      global.msg(req, res, MESSAGE.SOMETHING_WENT_WRONG),
      err
    );
  }
},  


    /**This function is used to get listByIds */
    listByIds: async (req, res) => {
        let ids = JSON.parse(req.body.o_id);
        ids = ids.map((id) => new ObjectId(id));
        let json = {
            // role: USER_ROLES.SUPER_ADMIN,
            _id: {
                $in: ids,
            },
        };
        async.parallel({
            list: (callback) => {
                User.aggregate([{
                    $match: json,
                },
                {
                    $project: {
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
                        global.msg(req,res.MESSAGE.OPR_SUCCESS),
                        result
                    );
                } else {
                    return global.failResponse(
                        res,
                        global.msg(req,res,MESSAGE.SOMETHING_WENT_WRONG),
                        err
                    );
                }
            }
        );
    },

    /**This function is used to get edit */
    details: (req, res) => {
        const {
            o_id
        } = req.query;
        const json = {
            _id: new ObjectId(o_id),
        };
        Testimonials.aggregate([{
            $match: json,
        },
        global.userDataQuery("createdBy", "createdBy"),
        global.userDataQuery("updatedBy", "updatedBy"),
        {
            $project: {
                name: 1,
                role: 1,
                status: 1,
                address: 1,
                testimonial_text: 1,
                review: 1,
                rating: 1,
                city: 1,
                country: 1,
                rating : 1 , 
                createdAt: 1,
                updatedAt: 1,
                profile_image: global.userImageQuery(),
                // images: global.userMultiImageQuery(),
                createdBy: {
                    $arrayElemAt: ["$createdBy", 0],
                },
                updatedBy: {
                    $arrayElemAt: ["$updatedBy", 0],
                },
            },
        },
        ])
            .exec()
            .then(function (result) {
                if (result.length > 0) {
                    return global.successResponse(
                        res,
                        MESSAGE.OPR_SUCCESS,
                        result[0]
                    );
                } else {
                    return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
                }
            })
            .catch((err) => {
                return global.failResponse(res, err.message, err);
            });
    },

    /**This function is used to change status of user */
    changeStatus: (req, res) => {
        const {
            o_id,
            status
        } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = {
            _id: {
                $in: ids,
            },
        };
        Testimonials.updateMany(findJson, {
            $set: {
                status: status,
            },
        })
            .then(async (result) => {
                let users = await Testimonials.find({
                    _id: {
                        $in: ids,
                    },
                });
                // let dynamicOptions = {
                //     status: status == ACTIVE ? "activated" : "deactivated",
                // };
                /**sending email of change status of user by admin*/

                // let allLogs = await global.prepareLogs({
                //     records: users,
                //     email_slug: "user_status",
                //     dynamicOptions: dynamicOptions,
                // });
                // let insertedLogs = await EmailLogsModal.insertMany(allLogs);
                // await global.setEmailQueue(insertedLogs);
                return global.successResponse(res, global.msg(req,res,MESSAGE.STATUS_CHANGE));
            })
            .catch((err) => {
                return global.failResponse(
                    res,
                    err.message,
                    JSON.stringify(err)
                );
            });
    },

    delete: (req, res) => {
        const {
            o_id
        } = req.body;
        let ids = JSON.parse(o_id);
        let findJson = {
            _id: {
                $in: ids,
            },
        };
        Testimonials.find(findJson)
            .then(async (records) => {
                let users = await Testimonials.find({
                    _id: {
                        $in: ids,
                    },
                });
                /**sending email of delete user by admin */
                // let allLogs = await global.prepareLogs({
                //     records: users,
                //     email_slug: "delete_user",
                // });
                // let insertedLogs = await EmailLogsModal.insertMany(allLogs);
                // await global.setEmailQueue(insertedLogs);
                let filePaths = records.map(
                    (record) =>
                        UPLOAD_FILE_PATH + "users/" + record.profile_image
                );
                global
                    .removeFiles(filePaths)
                    .then(() => {
                        Testimonials.deleteMany(findJson)
                            .then(async (deleted) => {
                                return global.successResponse(
                                    res,
                                    global.msg(req,res,MESSAGE.DELETED), {}
                                );
                            })
                            .catch((error) => {
                                return global.failResponse(
                                    res,
                                    error.message,
                                    error
                                );
                            });
                    })
                    .catch((error) => {
                        return global.failResponse(res, error.message, error);
                    });
            })
            .catch((error) => {
                return global.failResponse(res, error.message, error);
            });
    },

    // assignMedia: (req, res) => {
    //     const { media, o_id } = req.body;
    //     User.updateOne({ _id: o_id }, { $set: { media: JSON.parse(media) } }).then(() => {
    //         return global.successResponse(res,global.msg(req, res, 'admin_assign_media_assigned'));
    //     }).catch((err) => {
    //         console.error(err);
    //         return global.failResponse(res, "Error updating user media.", err);
    //     });
    // },

    assignMedia: async (req, res) => {
        const {
            media,
            o_id,
            deleted_files
        } = req.body;
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
                file_path: {
                    $in: deletedFiles,
                },
            });
        }
        let json = {
            user_id: new ObjectId(o_id),
            file_path: {
                $in: parsedMedia,
            },
        };
        let alreadyExistsData = await SharedMediaModel.find(json);
        let alreadyExistsDataUrls = alreadyExistsData.map((item) => {
            return item.file_path;
        });
        let userData = await User.findOne({
            _id: new ObjectId(o_id),
        });
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
                                file_path: "/uploads/" + parentFolder + fileName,
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
                                        template.body, {
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
};

export default testimonialController;