import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import global from "../../../../../helpers/global-functions.js";
import GlobalFunctions from "../../../../../helpers/global-functions.js";
import UserModel from "../../../../../models/users.js";
import { USER_ROLES, ACTIVE, JWT_CONFIG, MESSAGE, PASSWORD_MIN_LENGTH, NOTIFICATIONS_TYPES } from "../../../../../global-variable.js";
import Notifications from "../../../../../models/notifications.js";
import { sendFCMToToken } from "../../../../../helpers/firebase-notification.js";
import { OAuth2Client } from "google-auth-library";
const ObjectId = mongoose.Types.ObjectId;
import { UPLOAD_FILE_PATH } from "../../../../../global-variable.js";
// import GlobalFunctions from "../../../../../helpers/global-functions.js";
import Posts from "../../../../../models/posts.js";
import Outfits from "../../../../../models/outfit.js";
import Items from "../../../../../models/items.js";
import Planner from "../../../../../models/planner.js";
import ReportedPosts from "../../../../../models/reported-posts.js";


const authController = {

  saveBasicProfile: async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        username,
        DOB,
        address,
        gender,
        stylist_referral_link,
        goals,
        // phone_number,
        // countryCode,
      } = req.body;

      const _id = req.user._id;

      if (!ObjectId.isValid(_id)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      // 🔹 Get existing user
      const existingUser = await UserModel.findById(_id);
      if (!existingUser) {
        return global.failResponse(res, "User not found", {});
      }

      // 🔹 Check if all slugs are true
      // const allSlugsCompleted = Object.values(existingUser.profile_slugs || {}).every(
      //   (val) => val === true
      // );

      // 🔹 If all slugs true → block username change
      // if (allSlugsCompleted && username && username !== existingUser.username) {
      //   return global.failResponse(res, "Username already taken", {});
      // }

      // 🔹 If slugs not completed → check uniqueness normally
      if (username && username !== existingUser.username) {
        const userWithSameUsername = await UserModel.findOne({ username });
        if (userWithSameUsername && userWithSameUsername._id.toString() !== _id.toString()) {
          return global.failResponse(res, "Username already taken", {});
        }
      }

      const imageName = await global.uploadFile(req, "profile_image", "users");

      const payload = {
        _id,
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        username,
        DOB,
        address,
        gender,
        stylist_referral_link,
        goals: typeof goals === "string" ? JSON.parse(goals) : goals,
        profile_image: imageName ? imageName : existingUser.profile_image,
        profile_slugs: {
          ...existingUser.profile_slugs,
          basic: true,
        },
      };

      // Add phone_number and countryCode if provided
      // if (phone_number !== undefined && phone_number !== null && phone_number !== "") {
      //   payload.phone_number = phone_number;
      // }
      // if (countryCode !== undefined && countryCode !== null && countryCode !== "") {
      //   payload.countryCode = countryCode;
      // }

      const tempUserData = { ...existingUser.toObject(), ...payload };
      payload.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion(tempUserData);

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: payload },
        { new: true, runValidators: true }
      );

      const profile_completion_percentage = payload.profile_completion_percentage;

      return global.successResponse(res, "Basic profile created successfully", { user, profile_completion_percentage });

    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  savePreferences: async (req, res) => {
    try {
      const _id = req.user._id;
      let { preferred_colors, brands } = req.body;

      preferred_colors =
        typeof preferred_colors === "string"
          ? JSON.parse(preferred_colors)
          : preferred_colors;

      brands =
        typeof brands === "string" ? JSON.parse(brands) : brands;

      const existingUser = await UserModel.findById(_id);
      const update = {
        preferred_colors,
        brands,
        "profile_slugs.preferences": true,
        profile_completion_percentage: await GlobalFunctions.calculateProfileCompletion({
          ...existingUser.toObject(),
          preferred_colors,
          brands,
          "profile_slugs.preferences": true
        })
      };

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!user) return global.failResponse(res, "User not found", {});

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Preferences created", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  saveSizeInfo: async (req, res) => {
    try {
      let { sizes, measurement } = req.body;
      const _id = req.user._id;

      sizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      measurement = typeof measurement === "string" ? JSON.parse(measurement) : measurement;

      const existingUser = await UserModel.findById(_id);
      const update = {
        sizes,
        measurement,
        "profile_slugs.size_info": true,
        profile_completion_percentage: await GlobalFunctions.calculateProfileCompletion({
          ...existingUser.toObject(),
          sizes,
          measurement,
          "profile_slugs.size_info": true
        })
      };

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!user) return global.failResponse(res, "User not found", {});

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Size info created", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  saveAppearance: async (req, res) => {
    try {
      const { dislikes, body_type, hair_color, hair_type, eye_color, face_shape, complexion } = req.body;
      const _id = req.user._id;

      const existingUser = await UserModel.findById(_id);
      const update = {
        dislikes,
        body_type,
        hair_color,
        hair_type,
        eye_color,
        face_shape,
        complexion,
        "profile_slugs.appearance": true
      };

      const fullBodyImages = await global.uploadFile(req, "full_body_image", "users");
      if (fullBodyImages) update.full_body_image = fullBodyImages;

      update.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion({
        ...existingUser.toObject(),
        ...update
      });

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!user) return global.failResponse(res, "User not found", {});

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Appearance created", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  saveStyleInfo: async (req, res) => {
    try {
      const { style_desc, style, mood_board, pinterest_link, sustain_preferences, marketPlace } = req.body;
      const _id = req.user._id;

      const existingUser = await UserModel.findById(_id);
      const update = {
        style_desc,
        style,
        mood_board,
        pinterest_link,
        sustain_preferences,
        marketPlace: typeof marketPlace === "string" ? JSON.parse(marketPlace) : marketPlace,
        "profile_slugs.style_info": true,
        profile_completion_percentage: await GlobalFunctions.calculateProfileCompletion({
          ...existingUser.toObject(),
          style_desc,
          style,
          mood_board,
          pinterest_link,
          sustain_preferences,
          marketPlace,
          "profile_slugs.style_info": true
        })
      };

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!user) return global.failResponse(res, "User not found", {});

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Style info created", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  savePrivacySettings: async (req, res) => {
    try {
      const _id = req.user._id;
      let { closetPrivacy, notification_settings, privacy_settings } = req.body;

      if (typeof notification_settings === "string") {
        notification_settings = JSON.parse(notification_settings);
      }

      if (typeof privacy_settings === "string") {
        privacy_settings = JSON.parse(privacy_settings);
      }

      const existingUser = await UserModel.findById(_id);
      const update = {
        "profile_slugs.privacy": true
      };

      if (closetPrivacy) update.closetPrivacy = closetPrivacy;

      if (privacy_settings) {
        if (privacy_settings.isPublic !== undefined) update["privacy_settings.isPublic"] = privacy_settings.isPublic;
        if (privacy_settings.only_me !== undefined) update["privacy_settings.only_me"] = privacy_settings.only_me;
        if (privacy_settings.followers_only !== undefined) update["privacy_settings.followers_only"] = privacy_settings.followers_only;
      }

      if (notification_settings?.push) {
        if (notification_settings.push.outfit_reminders !== undefined)
          update["notification_settings.push.outfit_reminders"] = notification_settings.push.outfit_reminders;
        if (notification_settings.push.new_messages !== undefined)
          update["notification_settings.push.new_messages"] = notification_settings.push.new_messages;
        if (notification_settings.push.posts_with_mention !== undefined)
          update["notification_settings.push.posts_with_mention"] = notification_settings.push.posts_with_mention;
        if (notification_settings.push.posts_from_follow !== undefined)
          update["notification_settings.push.posts_from_follow"] = notification_settings.push.posts_from_follow;
        if (notification_settings.push.bae_notifications !== undefined)
          update["notification_settings.push.bae_notifications"] = notification_settings.push.bae_notifications;
        if (notification_settings.push.likes !== undefined)
          update["notification_settings.push.likes"] = notification_settings.push.likes;
        if (notification_settings.push.comments !== undefined)
          update["notification_settings.push.comments"] = notification_settings.push.comments;
      }

      if (notification_settings?.email) {
        if (notification_settings.email.outfit_reminders !== undefined)
          update["notification_settings.email.outfit_reminders"] = notification_settings.email.outfit_reminders;
        if (notification_settings.email.new_messages !== undefined)
          update["notification_settings.email.new_messages"] = notification_settings.email.new_messages;
        if (notification_settings.email.posts_with_mention !== undefined)
          update["notification_settings.email.posts_with_mention"] = notification_settings.email.posts_with_mention;
        if (notification_settings.email.posts_from_follow !== undefined)
          update["notification_settings.email.posts_from_follow"] = notification_settings.email.posts_from_follow;
        if (notification_settings.email.bae_notifications !== undefined)
          update["notification_settings.email.bae_notifications"] = notification_settings.email.bae_notifications;
        if (notification_settings.email.likes !== undefined)
          update["notification_settings.email.likes"] = notification_settings.email.likes;
        if (notification_settings.email.comments !== undefined)
          update["notification_settings.email.comments"] = notification_settings.email.comments;
      }

      if (notification_settings?.sms) {
        if (notification_settings.sms.outfit_reminders !== undefined)
          update["notification_settings.sms.outfit_reminders"] = notification_settings.sms.outfit_reminders;
        if (notification_settings.sms.likes !== undefined)
          update["notification_settings.sms.likes"] = notification_settings.sms.likes;
        if (notification_settings.sms.comments !== undefined)
          update["notification_settings.sms.comments"] = notification_settings.sms.comments;
      }

      update.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion({
        ...existingUser.toObject(),
        ...update
      });

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true, runValidators: true }
      );

      if (!user) return global.failResponse(res, "User not found", {});

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Privacy settings created", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },


  getProfileCompletion: async (req, res) => {
    try {
      const _id = req.user._id;

      const user = await UserModel.findById(_id);
      if (!user) {
        return global.failResponse(res, "User not found", {});
      }

      let completedSections = 0;
      let totalSections = 6;

      const { profile_completion_percentage } = user;

      return global.successResponse(res, "Profile completion fetched successfully", {
        profile_completion_percentage
      });

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
        $lookup: {
          from: "users",
          localField: "following_users",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                full_name: 1,
                first_name: 1,
                last_name: 1,
                username: 1,
                profile_image: 1,
                bio: 1,
                followers: 1,
                following: 1,
                createdAt: 1,
              }
            },
          ],
          as: "following_users",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "followers_users",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                full_name: 1,
                first_name: 1,
                last_name: 1,
                username: 1,
                profile_image: 1,
                bio: 1,
                followers: 1,
                following: 1,
                createdAt: 1,
              }
            },
          ],
          as: "followers_users",
        },
      },
      {
        $project: {
          id: 1,
          full_name: 1,
          first_name: 1,
          last_name: 1,
          username: 1,
          countryCode: 1,
          phone_number: 1,
          profile_slugs: "$profile_slugs",
          DOB: 1,
          gender: 1,
          profile_slugs: 1,
          role: 1,
          email: 1,
          referral_link: 1,
          stylist_referral_link: 1,
          preferred_colors: 1,
          goals: 1,
          marketPlace: 1,
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
          privacy_settings: 1,
          notification_settings: 1,
          full_body_image: 1,
          profile_image: GlobalFunctions.userImageQueryLogo("profile_image"),
          shirt_size: 1,
          trouser_size: 1,
          assign_task: 1,
          shoe_size: 1,
          wrist_size: 1,
          address: 1,
          bio: 1,
          followers: 1,
          following: 1,
          following_users: 1,
          followers_users: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: { $arrayElemAt: ["$createdBy", 0] },
          updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
        },
      },
    ])
      .exec()
      .then(async function (result) {
        if (result.length > 0) {
          const userData = result[0];

          // Process privacy logic
          const viewerId = req.user._id.toString();
          const targetUserId = _id.toString();
          const isOwner = viewerId === targetUserId;
          const isFollower = userData.followers_users?.some((follower) => follower._id?.toString() === viewerId);
          const settings = userData.privacy_settings || { only_me: false, followers_only: false };

          let canViewOutfit = true;
          if (!isOwner) {
            if (settings.only_me) {
              canViewOutfit = false;
            } else if (settings.followers_only && !isFollower) {
              canViewOutfit = false;
            }
          }

          // Process full_body_image array (it's an array, not a single string)
          if (userData.full_body_image && Array.isArray(userData.full_body_image)) {
            userData.full_body_image = global.buildUploadUrls(userData.full_body_image);
          } else if (userData.full_body_image && typeof userData.full_body_image === 'string') {
            // Handle case where it might be a single string
            userData.full_body_image = [global.buildUploadUrl(userData.full_body_image)];
          } else {
            userData.full_body_image = [];
          }

          // Get items count
          const itemsCount = canViewOutfit ? await Items.countDocuments({
            createdBy: new ObjectId(_id),
            status: ACTIVE
          }) : 0;

          // Get items data (only if privacy allows)
          const itemsData = canViewOutfit
            ? await Items.find({ createdBy: new ObjectId(_id), status: ACTIVE })
              .sort({ createdAt: -1, _id: -1 })
              .select("_id name brand_name price purchased_on occasion mood season status statuses care size match_with_my_size measurements colors fabric notes tags images wear_count purchase_rent_toggle purchase_rent_price createdAt updatedAt category sub_category")
              .lean()
            : [];

          userData.items = itemsData.map((it) => ({
            ...it,
            images: Array.isArray(it.images)
              ? it.images
                .map((p) => {
                  if (!p) return null;
                  if (String(p).startsWith("http://") || String(p).startsWith("https://")) return String(p);
                  const clean = String(p).replace(/^\/+/, "").replace(/^uploads\/items\//, "");
                  return `${process.env.BASE_URL}/uploads/items/${clean}`;
                })
                .filter(Boolean)
              : [],
          }));

          // Add followers, following, and itemsCount to response
          userData.followers = userData.followers || 0;
          userData.following = userData.following || 0;
          userData.itemsCount = itemsCount;

          // Process following_users array
          if (userData.following_users && Array.isArray(userData.following_users)) {
            userData.following_users = userData.following_users.map(user => ({
              ...user,
              name: user.full_name || user.first_name || user.username,
              profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
            }));
          } else {
            userData.following_users = [];
          }

          // Process followers_users array
          if (userData.followers_users && Array.isArray(userData.followers_users)) {
            userData.followers_users = userData.followers_users.map(user => ({
              ...user,
              name: user.full_name || user.first_name || user.username,
              profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
            }));
          } else {
            userData.followers_users = [];
          }

          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), userData);
        } else {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  updateMyProfile: async (req, res) => {
    try {
      const { first_name, last_name, username, DOB, address, gender, stylist_referral_link, goals, phone_number, countryCode, bio } = req.body;

      const _id = req.user._id;

      if (!ObjectId.isValid(_id)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (username) {
        const userWithSameUsername = await UserModel.findOne({ username });
        if (userWithSameUsername && userWithSameUsername._id.toString() !== _id.toString()) {
          return global.failResponse(res, "Username already taken", {});
        }
      }

      const existingUser = await UserModel.findById(_id);
      let updateData = {};

      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (first_name && last_name) updateData.full_name = first_name + " " + last_name;

      if (username !== undefined) updateData.username = username;
      if (DOB !== undefined) updateData.DOB = DOB;
      if (address !== undefined) updateData.address = address;
      if (gender !== undefined) updateData.gender = gender;
      if (stylist_referral_link !== undefined) updateData.stylist_referral_link = stylist_referral_link;

      if (bio !== undefined) updateData.bio = bio;

      if (phone_number !== undefined && phone_number !== null && phone_number !== "") {
        updateData.phone_number = phone_number;
      }
      if (countryCode !== undefined && countryCode !== null && countryCode !== "") {
        updateData.countryCode = countryCode;
      }

      if (goals !== undefined) updateData.goals = typeof goals === "string" ? JSON.parse(goals) : goals;

      const imageName = await global.uploadFile(req, "profile_image", "users");

      if (imageName) {
        updateData.profile_image = imageName;
      }

      updateData.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion({
        ...existingUser.toObject(),
        ...updateData
      });

      const user = await UserModel.findByIdAndUpdate(_id, { $set: updateData }, { new: true }).select("-password");

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Profile updated", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  updateStyleAndAppearance: async (req, res) => {
    try {
      const {
        preferred_colors,
        brands,
        sizes,
        measurement,
        dislikes,
        body_type,
        hair_color,
        hair_type,
        eye_color,
        face_shape,
        complexion,
      } = req.body;

      const _id = req.user._id;
      const existingUser = await UserModel.findById(_id);
      let updateData = {};

      // Style Preferences
      if (preferred_colors !== undefined)
        updateData.preferred_colors =
          typeof preferred_colors === "string"
            ? JSON.parse(preferred_colors)
            : preferred_colors;

      if (brands !== undefined)
        updateData.brands =
          typeof brands === "string" ? JSON.parse(brands) : brands;

      // Size Info
      if (sizes !== undefined)
        updateData.sizes =
          typeof sizes === "string" ? JSON.parse(sizes) : sizes;

      if (measurement !== undefined)
        updateData.measurement =
          typeof measurement === "string"
            ? JSON.parse(measurement)
            : measurement;

      // Appearances
      if (dislikes !== undefined) updateData.dislikes = dislikes;
      if (body_type !== undefined) updateData.body_type = body_type;
      if (hair_color !== undefined) updateData.hair_color = hair_color;
      if (hair_type !== undefined) updateData.hair_type = hair_type;
      if (eye_color !== undefined) updateData.eye_color = eye_color;
      if (face_shape !== undefined) updateData.face_shape = face_shape;
      if (complexion !== undefined) updateData.complexion = complexion;

      // File Upload
      const fullBodyImages = await global.uploadFile(req, "full_body_image", "users");
      if (fullBodyImages) updateData.full_body_image = fullBodyImages;

      updateData.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion({
        ...existingUser.toObject(),
        ...updateData
      });

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: updateData },
        { new: true }
      ).select("-password");

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Profile updated successfully", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  updateStyleInfo: async (req, res) => {
    try {
      const { style_desc, style, mood_board, pinterest_link, sustain_preferences } = req.body;

      const _id = req.user._id;
      const existingUser = await UserModel.findById(_id);
      let updateData = {};

      if (style_desc !== undefined) updateData.style_desc = style_desc;
      if (style !== undefined) updateData.style = style;
      if (mood_board !== undefined) updateData.mood_board = mood_board;
      if (pinterest_link !== undefined) updateData.pinterest_link = pinterest_link;
      if (sustain_preferences !== undefined) updateData.sustain_preferences = sustain_preferences;

      updateData.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion({
        ...existingUser.toObject(),
        ...updateData
      });

      const updateUser = await UserModel.findByIdAndUpdate(_id, { $set: updateData }, { new: true }).select("-password");

      const profile_completion_percentage = updateUser.profile_completion_percentage;
      return global.successResponse(res, "Style info updated", {
        user: updateUser,
        profile_completion_percentage
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  updatePrivacySettings: async (req, res) => {
    try {
      const _id = req.user._id;
      const { closetPrivacy } = req.body;

      let notificationSettings = req.body.notification_settings;
      let privacySettings = req.body.privacy_settings;

      if (typeof notificationSettings === "string") {
        notificationSettings = JSON.parse(notificationSettings);
      }

      if (typeof privacySettings === "string") {
        privacySettings = JSON.parse(privacySettings);
      }

      const existingUser = await UserModel.findById(_id);
      const update = {};

      if (closetPrivacy) {
        update.closetPrivacy = closetPrivacy;
      }

      if (privacySettings) {
        if (privacySettings.isPublic !== undefined) {
          update["privacy_settings.isPublic"] = privacySettings.isPublic;
        }
        if (privacySettings.only_me !== undefined) {
          update["privacy_settings.only_me"] = privacySettings.only_me;
        }
        if (privacySettings.followers_only !== undefined) {
          update["privacy_settings.followers_only"] = privacySettings.followers_only;
        }
      }

      if (notificationSettings?.push) {
        if (notificationSettings.push.outfit_reminders !== undefined) {
          update["notification_settings.push.outfit_reminders"] =
            notificationSettings.push.outfit_reminders;
        }
        if (notificationSettings.push.new_messages !== undefined) {
          update["notification_settings.push.new_messages"] =
            notificationSettings.push.new_messages;
        }
        if (notificationSettings.push.posts_with_mention !== undefined) {
          update["notification_settings.push.posts_with_mention"] =
            notificationSettings.push.posts_with_mention;
        }
        if (notificationSettings.push.posts_from_follow !== undefined) {
          update["notification_settings.push.posts_from_follow"] =
            notificationSettings.push.posts_from_follow;
        }
        if (notificationSettings.push.bae_notifications !== undefined) {
          update["notification_settings.push.bae_notifications"] =
            notificationSettings.push.bae_notifications;
        }
        if (notificationSettings.push.likes !== undefined) {
          update["notification_settings.push.likes"] =
            notificationSettings.push.likes;
        }
        if (notificationSettings.push.comments !== undefined) {
          update["notification_settings.push.comments"] =
            notificationSettings.push.comments;
        }
      }

      if (notificationSettings?.email) {
        if (notificationSettings.email.outfit_reminders !== undefined) {
          update["notification_settings.email.outfit_reminders"] =
            notificationSettings.email.outfit_reminders;
        }
        if (notificationSettings.email.new_messages !== undefined) {
          update["notification_settings.email.new_messages"] =
            notificationSettings.email.new_messages;
        }
        if (notificationSettings.email.posts_with_mention !== undefined) {
          update["notification_settings.email.posts_with_mention"] =
            notificationSettings.email.posts_with_mention;
        }
        if (notificationSettings.email.posts_from_follow !== undefined) {
          update["notification_settings.email.posts_from_follow"] =
            notificationSettings.email.posts_from_follow;
        }
        if (notificationSettings.email.bae_notifications !== undefined) {
          update["notification_settings.email.bae_notifications"] =
            notificationSettings.email.bae_notifications;
        }
        if (notificationSettings.email.likes !== undefined) {
          update["notification_settings.email.likes"] =
            notificationSettings.email.likes;
        }
        if (notificationSettings.email.comments !== undefined) {
          update["notification_settings.email.comments"] =
            notificationSettings.email.comments;
        }
      }

      if (notificationSettings?.sms) {
        if (notificationSettings.sms.outfit_reminders !== undefined) {
          update["notification_settings.sms.outfit_reminders"] =
            notificationSettings.sms.outfit_reminders;
        }
        if (notificationSettings.sms.likes !== undefined) {
          update["notification_settings.sms.likes"] =
            notificationSettings.sms.likes;
        }
        if (notificationSettings.sms.comments !== undefined) {
          update["notification_settings.sms.comments"] =
            notificationSettings.sms.comments;
        }
      }

      update.profile_completion_percentage = await GlobalFunctions.calculateProfileCompletion({
        ...existingUser.toObject(),
        ...update
      });

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true }
      ).select("-password");

      const profile_completion_percentage = user.profile_completion_percentage;
      return global.successResponse(res, "Privacy settings updated", { user, profile_completion_percentage });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  goalList: async (req, res) => {
    try {
      const aiList = [
        {
          slug: "digitize-my-wardrobe",
          title: "Digitize my wardrobe",
        },
        {
          slug: "shopping",
          title: "Shopping",
        },
        {
          slug: "sell-preloved-thrift",
          title: "Sell preloved/thrift",
        },
        {
          slug: "plan-my-outfits-save-time",
          title: "Plan my outfits and save time",
        },
        {
          slug: "styling-tips",
          title: "Styling tips",
        },
        {
          slug: "get-my-tribe-community",
          title: "Get my tribe/community",
        },
        {
          slug: "track-what-im-wearing",
          title: "Track what I'm wearing",
        },
        {
          slug: "create-discover-outfits",
          title: "Create and discover outfits",
        },
        {
          slug: "wardrobe-stats-insights",
          title: "Wardrobe stats and insights",
        },
      ];

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        list: aiList,
        total_records: aiList.length,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  getAllUsers: async (req, res) => {
    try {
      if (!req.body) {
        return global.failResponse(res, "Request body is required", {});
      }
      const { user_id, type } = req.body;

      if (!user_id || !ObjectId.isValid(user_id)) {
        return global.failResponse(res, "Invalid user ID. user_id is required", {});
      }

      if (!type || !["outfit", "post", "items"].includes(type)) {
        return global.failResponse(res, "Invalid type. Must be 'outfit', 'post', or 'items'", {});
      }

      const userResult = await UserModel.aggregate([
        {
          $match: {
            _id: new ObjectId(user_id),
            status: ACTIVE
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "following_users",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  full_name: 1,
                  first_name: 1,
                  last_name: 1,
                  username: 1,
                  profile_image: 1,
                  bio: 1,
                  followers: 1,
                  following: 1,
                  createdAt: 1,
                }
              },
            ],
            as: "following_users",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "followers_users",
            foreignField: "_id",
            pipeline: [
              {
                $project: {
                  _id: 1,
                  full_name: 1,
                  first_name: 1,
                  last_name: 1,
                  username: 1,
                  profile_image: 1,
                  bio: 1,
                  followers: 1,
                  following: 1,
                  createdAt: 1,
                }
              },
            ],
            as: "followers_users",
          },
        },
        {
          $project: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            username: 1,
            profile_image: 1,
            followers: 1,
            following: 1,
            bio: 1,
            following_users: 1,
            followers_users: 1,
            privacy_settings: 1,
            createdAt: 1,
          }
        }
      ]).exec();

      if (userResult.length === 0) {
        return global.failResponse(res, "User not found", {});
      }

      const user = userResult[0];

      const viewerId = req.user._id.toString();
      const isOwner = viewerId === user_id.toString();
      const isFollower = user.followers_users?.some((follower) => follower._id.toString() === viewerId);
      const settings = user.privacy_settings || { only_me: false, followers_only: false };

      let canViewOutfit = true;
      let canViewPost = true; // Posts are always public per user request

      if (!isOwner) {
        if (settings.only_me) {
          canViewOutfit = false;
        } else if (settings.followers_only && !isFollower) {
          canViewOutfit = false;
        }
      }

      const postsCountFilter = { createdBy: new ObjectId(user_id) };
      if (!isOwner && !isFollower) {
        postsCountFilter.followers_only = { $ne: true };
      }
      const postsCount = canViewPost ? await Posts.countDocuments(postsCountFilter) : 0;

      const outfitsCount = canViewOutfit
        ? await Outfits.countDocuments({
          createdBy: new ObjectId(user_id),
          status: ACTIVE,
        })
        : 0;

      const itemsCount = canViewOutfit
        ? await Items.countDocuments({
          createdBy: new ObjectId(user_id),
          status: ACTIVE,
        })
        : 0;

      // Process following_users array (all users I follow, including mutual follows)
      let processedFollowingUsers = [];
      if (user.following_users && Array.isArray(user.following_users)) {
        processedFollowingUsers = user.following_users.map(followUser => ({
          ...followUser,
          name: followUser.full_name || followUser.first_name || followUser.username,
          profile_image: GlobalFunctions.buildUserImageUrl(followUser.profile_image),
        }));
      }

      // Process followers_users array (all users who follow me, including mutual follows)
      let processedFollowersUsers = [];
      if (user.followers_users && Array.isArray(user.followers_users)) {
        processedFollowersUsers = user.followers_users.map(followerUser => ({
          ...followerUser,
          name: followerUser.full_name || followerUser.first_name || followerUser.username,
          profile_image: GlobalFunctions.buildUserImageUrl(followerUser.profile_image),
        }));
      }

      const responseData = {
        ...user,
        name: user.full_name || user.first_name || user.username,
        profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
        // profile_image already has full URL from userImageQueryLogo aggregation
        followers: user.followers || 0,
        following: user.following || 0,
        following_users: processedFollowingUsers,
        followers_users: processedFollowersUsers,
        postsCount: postsCount,
        outfitsCount: outfitsCount,
        itemsCount: itemsCount,
      };

      const normalizeItemImageUrls = (images = []) => {
        const list = Array.isArray(images) ? images : images ? [images] : [];
        return list
          .map((img) => {
            if (!img) return null;
            const raw = String(img);
            if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
            const clean = raw.replace(/^\/+/, "").replace(/^uploads\/items\//, "");
            return `${process.env.BASE_URL}/uploads/items/${clean}`;
          })
          .filter(Boolean);
      };

      if (type === "post" && !canViewPost) {
        responseData.posts = [];
        responseData.postsCount = 0;
      } else if (type === "post") {
        const postMatch = { createdBy: new ObjectId(user_id) };
        if (!isOwner && !isFollower) {
          postMatch.followers_only = { $ne: true };
        }
        const userPosts = await Posts.aggregate([
          {
            $match: postMatch
          },
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    full_name: 1,
                    username: 1,
                    profile_image: 1,
                  },
                },
              ],
              as: "createdBy",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "likes",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    full_name: 1,
                    username: 1,
                    profile_image: 1,
                  },
                },
              ],
              as: "likedBy",
            },
          },
          {
            $unwind: {
              path: "$comments",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "users",
              localField: "comments.userId",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    full_name: 1,
                    username: 1,
                    profile_image: 1,
                  },
                },
              ],
              as: "comments.userDetails",
            },
          },
          {
            $group: {
              _id: "$_id",
              name: { $first: "$name" },
              caption: { $first: "$caption" },
              collaborate: { $first: "$collaborate" },
              videos: { $first: "$videos" },
              images: { $first: "$images" },
              tags: { $first: "$tags" },
              location: { $first: "$location" },
              hideLikes: { $first: "$hideLikes" },
              hideComments: { $first: "$hideComments" },
              turnOffComments: { $first: "$turnOffComments" },
              createdBy: { $first: "$createdBy" },
              likedBy: { $first: "$likedBy" },
              likes: { $first: "$likes" },
              createdAt: { $first: "$createdAt" },
              updatedAt: { $first: "$updatedAt" },
              thumbnail: { $first: "$thumbnail" },
              comments: {
                $push: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$comments", null] },
                        { $ne: ["$comments._id", null] },
                        { $ne: [{ $type: "$comments._id" }, "missing"] }
                      ]
                    },
                    then: {
                      _id: "$comments._id",
                      userId: "$comments.userId",
                      comment: "$comments.comment",
                      createdAt: "$comments.createdAt",
                      updatedAt: "$comments.updatedAt",
                      user: { $arrayElemAt: ["$comments.userDetails", 0] }
                    },
                    else: "$$REMOVE"
                  }
                }
              }
            }
          },
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              caption: 1,
              collaborate: 1,
              videos: 1,
              images: 1,
              tags: 1,
              location: 1,
              hideLikes: 1,
              hideComments: 1,
              thumbnail: 1,
              turnOffComments: 1,
              likesCount: { $size: { $ifNull: ["$likes", []] } },
              commentsCount: {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$comments", []] },
                    as: "comment",
                    cond: {
                      $and: [
                        { $ne: ["$$comment", null] },
                        { $ne: ["$$comment", {}] },
                        { $ne: [{ $type: "$$comment._id" }, "missing"] },
                        { $ne: ["$$comment._id", null] }
                      ]
                    }
                  }
                }
              },
              createdBy: { $arrayElemAt: ["$createdBy", 0] },
              likedBy: 1,
              comments: {
                $filter: {
                  input: { $ifNull: ["$comments", []] },
                  as: "comment",
                  cond: {
                    $and: [
                      { $ne: ["$$comment", null] },
                      { $ne: ["$$comment", {}] },
                      { $ne: [{ $type: "$$comment._id" }, "missing"] },
                      { $ne: ["$$comment._id", null] }
                    ]
                  }
                }
              },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ]).exec();
        const processedPosts = userPosts.map((post) => {
          const processedPost = {
            ...post,
            images: global.buildUploadUrls(post.images || []),
            videos: global.buildUploadUrls(post.videos || []),
            thumbnail: post.thumbnail ? global.buildUploadUrls([post.thumbnail])[0] ?? null : null,
            createdBy: post.createdBy ? {
              ...post.createdBy,
              name: post.createdBy.full_name || post.createdBy.name || post.createdBy.username,
              profile_image: global.buildUserImageUrl(post.createdBy.profile_image),
            } : null,
            likedBy: (post.likedBy || []).map(likeUser => ({
              _id: likeUser._id,
              name: likeUser.full_name || likeUser.name || likeUser.username,
              username: likeUser.username,
              profile_image: global.buildUserImageUrl(likeUser.profile_image),
            })),
            comments: (post.comments || []).filter(comment => comment && comment._id).map(comment => ({
              _id: comment._id,
              comment: comment.comment,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              user: comment.user ? {
                _id: comment.user._id,
                name: comment.user.full_name || comment.user.name || comment.user.username,
                username: comment.user.username,
                profile_image: global.buildUserImageUrl(comment.user.profile_image),
              } : null,
            })),
          };
          return global.applyPostHideFlags(processedPost, viewerId);
        });

        responseData.posts = processedPosts;
        responseData.postsCount = processedPosts.length;
      }
      if (type === "outfit" && !canViewOutfit) {
        responseData.outfits = [];
      } else if (type === "outfit") {
        const userOutfits = await Outfits.aggregate([
          {
            $match: { createdBy: new ObjectId(user_id), status: ACTIVE }
          },
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $lookup: {
              from: "subcategories",
              localField: "sub_category",
              foreignField: "_id",
              as: "sub_category",
            },
          },
          {
            $unwind: {
              path: "$item_id",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: "items",
              localField: "item_id",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    price: 1,
                    images: 1,
                  },
                },
              ],
              as: "items",
            },
          },
          {
            $group: {
              _id: "$_id",
              name: { $first: "$name" },
              description: { $first: "$description" },
              suitable: { $first: "$suitable" },
              occasion: { $first: "$occasion" },
              status: { $first: "$status" },
              notes: { $first: "$notes" },
              tags: { $first: "$tags" },
              images: { $first: "$images" },
              category: { $first: "$category" },
              sub_category: { $first: "$sub_category" },
              createdAt: { $first: "$createdAt" },
              updatedAt: { $first: "$updatedAt" },
              items: {
                $push: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$items", null] },
                        { $ne: [{ $size: "$items" }, 0] }
                      ]
                    },
                    then: { $arrayElemAt: ["$items", 0] },
                    else: "$$REMOVE"
                  }
                }
              }
            }
          },
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          {
            $project: {
              _id: 1,
              name: 1,
              description: 1,
              suitable: 1,
              occasion: 1,
              status: 1,
              notes: 1,
              tags: 1,
              images: 1,
              category: { $arrayElemAt: ["$category", 0] },
              sub_category: { $arrayElemAt: ["$sub_category", 0] },
              items: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ]).exec();
        const processedOutfits = userOutfits.map((outfit) => {
          return {
            ...outfit,
            images: global.buildUploadUrls(outfit.images || []),
            items: (outfit.items || []).map(item => ({
              ...item,
              images: normalizeItemImageUrls(item.images || [])
            }))
          };
        });

        responseData.outfits = processedOutfits;
      }
      if (type === "items" && !canViewOutfit) {
        responseData.items = [];
      } else if (type === "items") {
        const userItems = await Items.aggregate([
          {
            $match: {
              createdBy: new ObjectId(user_id),
              status: ACTIVE
            }
          },
          {
            $sort: { createdAt: -1, _id: -1 }
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $lookup: {
              from: "subcategories",
              localField: "sub_category",
              foreignField: "_id",
              as: "sub_category",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "createdBy",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    full_name: 1,
                    username: 1,
                    profile_image: 1,
                  },
                },
              ],
              as: "createdBy",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              brand_name: 1,
              price: 1,
              purchased_on: 1,
              occasion: 1,
              mood: 1,
              season: 1,
              status: 1,
              statuses: 1,
              care: 1,
              size: 1,
              match_with_my_size: 1,
              measurements: 1,
              colors: 1,
              fabric: 1,
              notes: 1,
              tags: 1,
              images: 1,
              thumbnail: 1,
              category: { $arrayElemAt: ["$category", 0] },
              sub_category: { $arrayElemAt: ["$sub_category", 0] },
              createdBy: { $arrayElemAt: ["$createdBy", 0] },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ]).exec();
        const processedItems = userItems.map((item) => {
          return {
            ...item,
            images: normalizeItemImageUrls(item.images || []),
            createdBy: item.createdBy ? {
              ...item.createdBy,
              name: item.createdBy.full_name || item.createdBy.name || item.createdBy.username,
              profile_image: global.buildUserImageUrl(item.createdBy.profile_image),
            } : null,
          };
        });

        responseData.items = processedItems;
      }

      return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), responseData);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  searchUsers: async (req, res) => {
    try {
      const { q } = req.query;
      const loggedInUserId = req.user._id;

      if (!q || !q.trim()) {
        return global.failResponse(res, "Search query is required", {});
      }

      const currentUser = await UserModel.findById(loggedInUserId).select("blocked_users").lean();
      const blockedIds = currentUser?.blocked_users || [];

      const searchRegex = { $regex: q.trim(), $options: "i" };

      const users = await UserModel.aggregate([
        {
          $match: {
            _id: { $ne: new ObjectId(loggedInUserId), $nin: blockedIds },
            status: ACTIVE,
            role: { $ne: USER_ROLES.SUPER_ADMIN },
            $or: [
              { full_name: searchRegex },
              { first_name: searchRegex },
              { last_name: searchRegex },
              { username: searchRegex },
            ],
          },
        },
        { $limit: 20 },
        {
          $lookup: {
            from: "posts",
            let: { userId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$createdBy", "$$userId"] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 3 },
              {
                $project: {
                  _id: 1,
                  images: 1,
                  name: 1,
                  caption: 1,
                  createdAt: 1
                }
              }
            ],
            as: "user_posts",
          },
        },
        {
          $project: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            username: 1,
            bio: 1,
            followers: 1,
            following: 1,
            profile_image: GlobalFunctions.userImageQueryLogo("profile_image"),
            posts: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$privacy_settings.only_me", true] },
                    { $ne: [{ $ifNull: ["$closetPrivacy", "ONLY_ME"] }, "ONLY_ME"] },
                    {
                      $or: [
                        { $ne: ["$privacy_settings.followers_only", true] },
                        { $in: [new ObjectId(loggedInUserId), { $ifNull: ["$followers_users", []] }] },
                      ],
                    },
                  ],
                },
                then: "$user_posts",
                else: [],
              },
            },
          },
        },
      ]);

      const postsData = await Posts.aggregate([
        {
          $match: {
            createdBy: { $nin: blockedIds, $ne: new ObjectId(loggedInUserId) },
            $or: [
              { name: searchRegex },
              { caption: searchRegex },
              { tags: searchRegex },
            ],
          },
        },
        { $limit: 20 },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creator",
          },
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: false } },
        {
          $match: {
            "creator.status": ACTIVE,
            "creator.role": { $ne: USER_ROLES.SUPER_ADMIN },
            $and: [
              { "creator.privacy_settings.only_me": { $ne: true } },
              { "creator.closetPrivacy": { $ne: "ONLY_ME" } },
              {
                $or: [
                  { "creator.privacy_settings.followers_only": { $ne: true } },
                  { "creator.followers_users": new ObjectId(loggedInUserId) },
                ],
              },
              {
                $or: [
                  { followers_only: { $ne: true } },
                  { "creator.followers_users": new ObjectId(loggedInUserId) },
                ],
              },
            ],
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            caption: 1,
            tags: 1,
            images: 1,
            createdAt: 1,
            "creator._id": 1,
            "creator.full_name": 1,
            "creator.first_name": 1,
            "creator.last_name": 1,
            "creator.username": 1,
            "creator.profile_image": GlobalFunctions.userImageQueryLogo("creator.profile_image"),
          },
        },
      ]);

      // Formatting post images to full URLs
      const formattedUsers = users.map(user => {
        if (user.posts && user.posts.length > 0) {
          user.posts = user.posts.map(post => ({
            ...post,
            images: global.buildUploadUrls(post.images || [])
          }));
        }
        return user;
      });

      const formattedPosts = postsData.map(post => ({
        ...post,
        images: global.buildUploadUrls(post.images || []),
        creator: {
          ...post.creator,
          // Since profile_image is fully resolved via userImageQueryLogo, we can just use it directly
          // or run it through buildUserImageUrl to be safe if it's somehow not fully resolved.
          profile_image: GlobalFunctions.buildUserImageUrl(post.creator?.profile_image)
        }
      }));

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, { 
        users: formattedUsers, 
        totalUsers: formattedUsers.length,
        posts: formattedPosts,
        totalPosts: formattedPosts.length
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  blockUser: async (req, res) => {
    try {
      const { user_id } = req.body;
      const loggedInUserId = req.user._id;

      if (!user_id || !ObjectId.isValid(user_id)) {
        return global.failResponse(res, "Invalid user ID. user_id is required", {});
      }

      if (loggedInUserId.toString() === user_id.toString()) {
        return global.failResponse(res, "You cannot block yourself", {});
      }

      // Check if user exists
      const userToBlock = await UserModel.findById(user_id);
      if (!userToBlock) {
        return global.failResponse(res, "User not found", {});
      }

      // Check if already blocked
      const currentUser = await UserModel.findById(loggedInUserId);
      if (currentUser.blocked_users && currentUser.blocked_users.includes(new ObjectId(user_id))) {
        return global.failResponse(res, "User is already blocked", {});
      }

      // Add user to blocked_users array
      await UserModel.findByIdAndUpdate(
        loggedInUserId,
        { $addToSet: { blocked_users: new ObjectId(user_id) } },
        { new: true }
      );

      return global.successResponse(res, "User blocked successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  unblockUser: async (req, res) => {
    try {
      const { user_id } = req.body;
      const loggedInUserId = req.user._id;

      if (!user_id || !ObjectId.isValid(user_id)) {
        return global.failResponse(res, "Invalid user ID. user_id is required", {});
      }

      if (loggedInUserId.toString() === user_id.toString()) {
        return global.failResponse(res, "You cannot unblock yourself", {});
      }

      // Check if user exists
      const userToUnblock = await UserModel.findById(user_id);
      if (!userToUnblock) {
        return global.failResponse(res, "User not found", {});
      }

      // Check if user is blocked
      const currentUser = await UserModel.findById(loggedInUserId);
      if (!currentUser.blocked_users || !currentUser.blocked_users.includes(new ObjectId(user_id))) {
        return global.failResponse(res, "User is not blocked", {});
      }

      // Remove user from blocked_users array
      await UserModel.findByIdAndUpdate(
        loggedInUserId,
        { $pull: { blocked_users: new ObjectId(user_id) } },
        { new: true }
      );

      return global.successResponse(res, "User unblocked successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getBlockedUsers: async (req, res) => {
    try {
      const loggedInUserId = req.user._id;

      // Get logged-in user with blocked_users
      const currentUser = await UserModel.findById(loggedInUserId).select("blocked_users").lean();

      if (!currentUser || !currentUser.blocked_users || currentUser.blocked_users.length === 0) {
        return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {
          blockedUsers: [],
          total_count: 0
        });
      }

      // Get all blocked users details
      const blockedUsers = await UserModel.aggregate([
        {
          $match: {
            _id: { $in: currentUser.blocked_users },
            status: ACTIVE
          }
        },
        {
          $project: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            username: 1,
            profile_image: 1,
            bio: 1,
            followers: 1,
            following: 1,
            createdAt: 1,
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).exec();

      // Process blocked users
      const processedBlockedUsers = blockedUsers.map(user => ({
        ...user,
        name: user.full_name || user.first_name || user.username,
        profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
      }));

      return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {
        blockedUsers: processedBlockedUsers,
        total_count: processedBlockedUsers.length
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getFollowers: async (req, res) => {
    try {
      const loggedInUserId = req.user._id;

      // Get logged-in user with followers_users and following_users
      const currentUser = await UserModel.findById(loggedInUserId).select("followers_users following_users").lean();

      if (!currentUser) {
        return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {
          followers: [],
          following: [],
          total_count: 0
        });
      }

      const followerIds = currentUser.followers_users || [];
      const followingIds = currentUser.following_users || [];

      // Fetch followers
      let followers = [];
      if (followerIds.length > 0) {
        followers = await UserModel.aggregate([
          { $match: { _id: { $in: followerIds }, status: ACTIVE } },
          {
            $project: {
              _id: 1, full_name: 1, first_name: 1, last_name: 1, username: 1,
              profile_image: 1, bio: 1, followers: 1, following: 1, createdAt: 1,
            }
          },
          { $sort: { createdAt: -1 } }
        ]).exec();
      }

      // Fetch following
      let following = [];
      if (followingIds.length > 0) {
        following = await UserModel.aggregate([
          { $match: { _id: { $in: followingIds }, status: ACTIVE } },
          {
            $project: {
              _id: 1, full_name: 1, first_name: 1, last_name: 1, username: 1,
              profile_image: 1, bio: 1, followers: 1, following: 1, createdAt: 1,
            }
          },
          { $sort: { createdAt: -1 } }
        ]).exec();
      }

      const processedFollowers = followers.map(user => ({
        ...user,
        name: user.full_name || user.first_name || user.username,
        profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
      }));

      const processedFollowing = following.map(user => ({
        ...user,
        name: user.full_name || user.first_name || user.username,
        profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
      }));

      return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {
        followers: processedFollowers,
        following: processedFollowing,
        total_followers: processedFollowers.length,
        total_following: processedFollowing.length,
        total_count: processedFollowers.length + processedFollowing.length
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getFollowing: async (req, res) => {
    try {
      const loggedInUserId = req.user._id;

      // Get logged-in user with following_users
      const currentUser = await UserModel.findById(loggedInUserId).select("following_users").lean();

      if (!currentUser || !currentUser.following_users || currentUser.following_users.length === 0) {
        return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {
          following: [],
          total_count: 0
        });
      }

      // Get all following users details
      const following = await UserModel.aggregate([
        {
          $match: {
            _id: { $in: currentUser.following_users },
            status: ACTIVE
          }
        },
        {
          $project: {
            _id: 1,
            full_name: 1,
            first_name: 1,
            last_name: 1,
            username: 1,
            profile_image: 1,
            bio: 1,
            followers: 1,
            following: 1,
            createdAt: 1,
          }
        },
        {
          $sort: { createdAt: -1 }
        }
      ]).exec();

      const processedFollowing = following.map(user => ({
        ...user,
        name: user.full_name || user.first_name || user.username,
        profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
      }));

      return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {
        following: processedFollowing,
        total_count: processedFollowing.length
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  followUser: async (req, res) => {
    try {
      const { user_id } = req.body;
      const loggedInUserId = req.user._id;

      if (!user_id || !ObjectId.isValid(user_id)) {
        return global.failResponse(res, "Invalid user ID. user_id is required", {});
      }

      if (loggedInUserId.toString() === user_id.toString()) {
        return global.failResponse(res, "You cannot follow yourself", {});
      }

      // Check if user exists
      const userToFollow = await UserModel.findById(user_id);
      if (!userToFollow) {
        return global.failResponse(res, "User not found", {});
      }

      // Check if already following
      const currentUser = await UserModel.findById(loggedInUserId);
      const user_id_obj = new ObjectId(user_id);
      if (currentUser.following_users && currentUser.following_users.some(id => id.toString() === user_id_obj.toString())) {
        return global.failResponse(res, "You are already following this user", {});
      }

      // Add user to following_users array and increment following count
      await UserModel.findByIdAndUpdate(
        loggedInUserId,
        {
          $addToSet: { following_users: new ObjectId(user_id) },
          $inc: { following: 1 }
        },
        { new: true }
      );

      // Add logged-in user to target user's followers_users array and increment followers count
      await UserModel.findByIdAndUpdate(
        user_id,
        {
          $addToSet: { followers_users: new ObjectId(loggedInUserId) },
          $inc: { followers: 1 }
        },
        { new: true }
      );

      // Send Follow Notification
      (async () => {
        try {
          const follower = await UserModel.findById(loggedInUserId).select("first_name name").lean();
          const followerName = follower?.first_name || follower?.name || "Someone";

          const allowPush = userToFollow.notification_settings?.push?.posts_from_follow !== false; // Reuse similar setting or user specific if exists

          const title = "New Follower";
          const body = `${followerName} started following you`;
          const pushData = { type: NOTIFICATIONS_TYPES.USER_FOLLOW, followerId: String(loggedInUserId) };

          if (allowPush) {
            try {
              await Notifications.create({
                userId: user_id,
                type: NOTIFICATIONS_TYPES.USER_FOLLOW,
                title, body,
                data: { followerId: String(loggedInUserId) },
                actorUserId: loggedInUserId,
              });
              console.log("[Notification] Follow user DB saved, to:", user_id, "from:", loggedInUserId);
            } catch (dbErr) {
              console.error("[Notification] Follow user DB error:", dbErr.message);
            }

            if (userToFollow.fcm_token) {
              sendFCMToToken(userToFollow.fcm_token, { title, body, data: pushData }).then(res => {
                console.log("[Notification] Follow user FCM res:", res, "to:", user_id);
              }).catch(e => console.error("[FCM] Follow error:", e.message));
            }
          } else {
            console.log("[Notification] Follow user skip both DB and FCM - push disabled, ownerId:", user_id);
          }
        } catch (err) {
          console.error("[Notification] follow error:", err.message);
        }
      })();

      return global.successResponse(res, "User followed successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  unfollowUser: async (req, res) => {
    try {
      const { user_id } = req.body;
      const loggedInUserId = req.user._id;

      if (!user_id || !ObjectId.isValid(user_id)) {
        return global.failResponse(res, "Invalid user ID. user_id is required", {});
      }

      if (loggedInUserId.toString() === user_id.toString()) {
        return global.failResponse(res, "You cannot unfollow yourself", {});
      }

      // Check if user exists
      const userToUnfollow = await UserModel.findById(user_id);
      if (!userToUnfollow) {
        return global.failResponse(res, "User not found", {});
      }

      // Check if user is being followed
      const currentUser = await UserModel.findById(loggedInUserId);
      const user_id_obj = new ObjectId(user_id);
      if (!currentUser.following_users || !currentUser.following_users.some(id => id.toString() === user_id_obj.toString())) {
        return global.failResponse(res, "You are not following this user", {});
      }

      // Remove user from following_users array and decrement following count
      await UserModel.findByIdAndUpdate(
        loggedInUserId,
        {
          $pull: { following_users: new ObjectId(user_id) },
          $inc: { following: -1 }
        },
        { new: true }
      );

      // Remove logged-in user from target user's followers_users array and decrement followers count
      await UserModel.findByIdAndUpdate(
        user_id,
        {
          $pull: { followers_users: new ObjectId(loggedInUserId) },
          $inc: { followers: -1 }
        },
        { new: true }
      );

      return global.successResponse(res, "User unfollowed successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  deleteAccount: async (req, res) => {
    try {
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        return global.failResponse(res, "User not found", {});
      }

      // Delete all user's posts
      await Posts.deleteMany({ createdBy: userId });

      // Delete all user's items
      await Items.deleteMany({ createdBy: userId });

      // Delete all user's outfits
      await Outfits.deleteMany({ createdBy: userId });

      // Delete all user's planner events
      await Planner.deleteMany({ createdBy: userId });

      // Delete all reported posts by this user
      await ReportedPosts.deleteMany({ user_id: userId });

      await UserModel.updateMany(
        { following_users: userId },
        { $pull: { following_users: userId }, $inc: { following: -1 } }
      );

      // Remove user from other users' followers_users arrays
      await UserModel.updateMany(
        { followers_users: userId },
        { $pull: { followers_users: userId }, $inc: { followers: -1 } }
      );

      // Remove user from other users' blocked_users arrays
      await UserModel.updateMany(
        { blocked_users: userId },
        { $pull: { blocked_users: userId } }
      );

      // Remove user from posts likes arrays
      await Posts.updateMany(
        { likes: userId },
        { $pull: { likes: userId } }
      );

      // Remove user's comments from posts
      await Posts.updateMany(
        {},
        { $pull: { comments: { userId: userId } } }
      );

      // Delete user account
      await UserModel.findByIdAndDelete(userId);

      return global.successResponse(res, "Account deleted successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  changePassword: async (req, res) => {
    const { current_password, new_password } = req.body;
    const { _id, password, name, email } = req.user;
    const findJson = { _id: new ObjectId(_id) };
    const userDetail = await UserModel.findOne(findJson)
    /**verify current password*/
    bcrypt.compare(current_password, userDetail.password).then(async (passwordMatch) => {
      if (passwordMatch) {
        let updateData = {
          /**Hashing the new password*/
          password: await global.incPassword(new_password)
        };
        UserModel.updateOne(findJson, { $set: updateData }).then(async () => {
          let options2 = {
            slug: "user_password_changed",
            dynamicStrings: {
              new_password: new_password,
              ... await global.getUserDynamicStrings(findJson)
            },
          };
          global.attachEmailTemplate(options2).then((template) => {
            global.sendEmail(template.subject, email, template.body, {
              name: name,
              email_slug: options2.slug
            }).then((mailData) => {
              return global.successResponse(res, global.msg(req, res, 'msg_password_changed_successfully'), {});
            }).catch((mailErr) => {
              global.failResponse(res, global.msg(req, res, 'err_email_not_send'), mailErr);
            });
          }).catch((err) => {
            return global.failResponse(res, err.message, err);
          });
        }).catch((err) => {
          return global.failResponse(res, err.message, err);
        });
      } else {
        return global.failResponse(res, global.msg(req, res, 'msg_current_password_not_match'), {});
      }
    }).catch((err) => {
      return global.failResponse(res, err.message, err);
    })

  },
};

export default authController;
