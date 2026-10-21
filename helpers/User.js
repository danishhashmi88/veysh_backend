const onlineUsersOnChat = [];
const onlineUsersForNotification = [];

export const addChatUser = ({ id, sender_id, receiver_id, room }) => {
  const existingUser = onlineUsersOnChat.filter((user) => {
    return user.room === room && user.sender_id === sender_id;
  })[0];
  if (existingUser) {
    /** This user is already joined no need to do anything */
  } else {
    const user = {
      id,
      sender_id,
      receiver_id,
      room,
    };
    onlineUsersOnChat.push(user);
  }
};

export const removeChatUser = (id) => {
  const index = onlineUsersOnChat.findIndex((user) => {
    return user.id === id;
  });
  if (index !== -1) {
    onlineUsersOnChat.splice(index, 1);
  }
};

export const getChatOnlineUser = (userId) =>
  onlineUsersOnChat.filter((user) => user.sender_id === userId)[0];

export const getUsersInRoom = (room) =>
  onlineUsersOnChat.filter((user) => user.room === room);

export const addNotificationUser = ({ id, room }) => {
  const existingUser = onlineUsersForNotification.filter((user) => {
    return user.room === room;
  })[0];
  if (existingUser) {
    /** This user is already joined no need to do anything */
  } else {
    const user = { id, room };
    onlineUsersForNotification.push(user);
  }
};

export const removeNotificationUser = (id) => {
  const index = onlineUsersForNotification.findIndex((user) => {
    return user.id === id;
  });
  if (index !== -1) {
    onlineUsersForNotification.splice(index, 1);
  }
};
