import { verifyGoogleSubscription } from "../../../../helpers/google-iap.js";
import userSubscription from "../../../../models/user-subscription.js";

const GoogleWebhookController = {
  notification: async (req, res) => {
    try {

      console.log(
        "GOOGLE RTDN =>",
        JSON.stringify(req.body, null, 2)
      );

      const message = req.body?.message;

      if (!message?.data) {
        return res.sendStatus(200);
      }

      const payload = JSON.parse(
        Buffer.from(message.data, "base64").toString("utf8")
      );

      console.log(
        "GOOGLE PAYLOAD =>",
        JSON.stringify(payload, null, 2)
      );

      const subscriptionNotification =
        payload.subscriptionNotification;

      if (!subscriptionNotification) {
        return res.sendStatus(200);
      }

      const purchaseToken =
        subscriptionNotification.purchaseToken;

      const notificationType =
        subscriptionNotification.notificationType;

      const googleData =
        await verifyGoogleSubscription(
          purchaseToken
        );

      const subscription =
        await userSubscription.findOne({
          purchase_token: purchaseToken,
        });

      if (!subscription) {
        return res.sendStatus(200);
      }

      switch (notificationType) {

        // Purchased / Renewed / Recovered
        case 4:
        case 2:
        case 7:

          subscription.start_date =
            new Date(googleData.startTime);

          subscription.end_date =
            new Date(googleData.expiryTime);

          subscription.order_id =
            googleData.orderId;

          subscription.subscription_state =
            googleData.subscriptionState;

          subscription.acknowledgement_state =
            googleData.acknowledgementState;

          subscription.verified = true;

          subscription.verified_at =
            new Date();

          subscription.status = 1;
          subscription.activated = true;

          await subscription.save();

          console.log(
            "Subscription Updated"
          );

          break;

        // Expired
        case 13:

          subscription.status = 0;
          subscription.activated = false;

          await subscription.save();

          console.log(
            "Subscription Expired"
          );

          break;

        // Revoked / Refunded
        case 12:

          subscription.status = 0;
          subscription.activated = false;

          await subscription.save();

          console.log(
            "Subscription Revoked"
          );

          break;

        default:

          console.log(
            "Unhandled Notification =>",
            notificationType
          );

      }

      return res.sendStatus(200);

    } catch (err) {

      console.error(
        "GOOGLE WEBHOOK ERROR =>",
        err
      );

      return res.sendStatus(500);

    }
  },
};

export default GoogleWebhookController;