import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import global from "../../../../../helpers/global-functions.js";
import UserModel from "../../../../../models/users.js";
import Notifications from "../../../../../models/notifications.js";
import { USER_ROLES, ACTIVE, JWT_CONFIG, MESSAGE, PASSWORD_MIN_LENGTH, PER_PAGE_RECORDS } from "../../../../../global-variable.js";
import { OAuth2Client } from "google-auth-library";
const ObjectId = mongoose.Types.ObjectId;
import { UPLOAD_FILE_PATH } from "../../../../../global-variable.js";


const notificationSettingController = {
    getSettings: async (req, res) => {
        try {
            const user_id = req.user._id;

            let user = await UserModel.findById(user_id).select('notification_settings');

            if (!user) {
                return global.failResponse(res, 'User not found', {});
            }

            if (!user.notification_settings || !user.notification_settings.push || !user.notification_settings.email) {
                const defaultSettings = {
                    push: {
                        outfit_reminders: true,
                        new_messages: true,
                        posts_with_mention: true,
                        posts_from_follow: true,
                        bae_notifications: true,
                        likes: true,
                        comments: true
                    },
                    email: {
                        outfit_reminders: true,
                        new_messages: true,
                        posts_with_mention: true,
                        posts_from_follow: true,
                        bae_notifications: true,
                        likes: true,
                        comments: true
                    }
                };
                user = await UserModel.findByIdAndUpdate(user_id, {
                    $set: { notification_settings: defaultSettings }
                }, { new: true, runValidators: true }).select('notification_settings');
            }

            return global.successResponse(res, 'Notification settings retrieved successfully', user.notification_settings);
        } catch (error) {
            console.error('getSettings Error:', error);
            return global.failResponse(res, error.message || 'Failed to get notification settings', {});
        }
    },


    updateSettings: async (req, res) => {
        try {
            const user_id = req.user._id;
            const { push, email } = req.body;

            const updateData = {};

            if (push && typeof push === 'object') {
                for (let key in push) {
                    updateData[`notification_settings.push.${key}`] = push[key];
                }
            }

            if (email && typeof email === 'object') {
                for (let key in email) {
                    updateData[`notification_settings.email.${key}`] = email[key];
                }
            }

            if (Object.keys(updateData).length === 0) {
                return global.failResponse(res, 'No settings provided to update', {});
            }

            const updatedUser = await UserModel.findByIdAndUpdate(
                user_id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('notification_settings');

            if (!updatedUser) {
                return global.failResponse(res, 'User not found', {});
            }

            return global.successResponse(res, 'Notification settings updated successfully', updatedUser.notification_settings);
        } catch (error) {
            console.error('updateSettings Error:', error);
            return global.failResponse(res, error.message || 'Failed to update notification settings', {});
        }
    },

    getPrivacySettings: async (req, res) => {
        try {
            const user_id = req.user._id;

            const user = await UserModel.findById(user_id).select('privacy_settings');

            if (!user) {
                return global.failResponse(res, 'User not found', {});
            }

            if (!user.privacy_settings) {
                user.privacy_settings = {
                    ispublic: true,
                    only_me: true,
                    followers_only: true
                };
                await user.save();
            }

            return global.successResponse(res, 'Privacy settings retrieved successfully', user.privacy_settings);
        } catch (error) {
            console.error('getPrivacySettings Error:', error);
            return global.failResponse(res, error.message || 'Failed to get privacy settings', {});
        }
    },

    updatePrivacySettings: async (req, res) => {
        try {
            const user_id = req.user._id;
            const { only_me, followers_only, ispublic } = req.body;

            const user = await UserModel.findById(user_id);

            if (!user) {
                return global.failResponse(res, 'User not found', {});
            }

            if (!user.privacy_settings) {
                user.privacy_settings = {
                    ispublic: true,
                    only_me: true,
                    followers_only: true
                };
            }

            if (ispublic !== undefined) {
                user.privacy_settings.ispublic = ispublic;
            }

            if (only_me !== undefined) {
                user.privacy_settings.only_me = only_me;
            }
            if (followers_only !== undefined) {
                user.privacy_settings.followers_only = followers_only;
            }

            await user.save();

            return global.successResponse(res, 'Privacy settings updated successfully', user.privacy_settings);  // ✅ Fix 3 & 4
        } catch (error) {
            console.error('updatePrivacySettings Error:', error);
            return global.failResponse(res, error.message || 'Failed to update privacy settings', {});
        }
    },

    /** List notifications for current user (paginated, newest first) */
    list: async (req, res) => {
        try {
            const user_id = req.user._id;
            const page = Number(req.query.page) || Number(req.body?.page) || 1;
            const per_page = Number(req.query.per_page) || Number(req.body?.per_page) || PER_PAGE_RECORDS;
            const skip = (page - 1) * per_page;

            const [list, total_records] = await Promise.all([
                Notifications.find({ userId: user_id })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(per_page)
                    .populate("actorUserId", "first_name name profile_image")
                    .lean(),
                Notifications.countDocuments({ userId: user_id }),
            ]);

            return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
                list,
                total_records,
                page,
                per_page,
            });
        } catch (error) {
            console.error("notification list Error:", error);
            return global.failResponse(res, error.message || "Failed to get notifications", {});
        }
    },

    /** Mark all notifications as read for current user */
    markAllAsRead: async (req, res) => {
        try {
            const user_id = req.user._id;

            await Notifications.updateMany(
                { userId: user_id, read: false },
                { $set: { read: true } }
            );

            return global.successResponse(res, 'All notifications marked as read successfully', {});
        } catch (error) {
            console.error("notification markAllAsRead Error:", error);
            return global.failResponse(res, error.message || "Failed to mark notifications as read", {});
        }
    },

    /** Mark single notification as read for current user */
    markAsRead: async (req, res) => {
        try {
            const user_id = req.user._id;
            const notification_id = req.params.id;

            if (!mongoose.Types.ObjectId.isValid(notification_id)) {
                return global.failResponse(res, 'Invalid notification ID', {});
            }

            const updatedNotification = await Notifications.findOneAndUpdate(
                { _id: notification_id, userId: user_id },
                { $set: { read: true } },
                { new: true }
            );

            if (!updatedNotification) {
                return global.failResponse(res, 'Notification not found', {});
            }

            return global.successResponse(res, 'Notification marked as read successfully', {});
        } catch (error) {
            console.error("notification markAsRead Error:", error);
            return global.failResponse(res, error.message || "Failed to mark notification as read", {});
        }
    },

};

export default notificationSettingController