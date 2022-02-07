import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ($('#in_room').length === 0) return;

  const chatChannel = consumer.subscriptions.create({ channel: 'RoomChannel', room: $('#in_room').data('room_id') }, {
    connected() {
      // Called when the subscription is ready for use on the server
    },

    disconnected() {
      // Called when the subscription has been terminated by the server
    },

    received: function(data) {
      const objChat = $('#chat-lists');
      const objUserList = $('#user-list');
      switch (data['status']){
        case 'user-chat':
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);
          break;

        case 'user-in':
          // 入室のアナウンス
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);

          // 入室者一覧に追加
          if ($(`#user-id-${data['user_id']}`).length === 0){
            objUserList.append(`<div class="user-name" id="user-id-${data['user_id']}"><p>${data['nickname']}</p></div>`);
          }
          break;

        case 'user-out':
          // 退室のアナウンス
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);

          // 入室者一覧から削除
          $(`#user-id-${data['user_id']}`).remove();
          break;
      }
    },

  speak: function(message) {
    return this.perform('speak', {
      status: 'user-chat',
      message: message
    });
  }
  });

  $(document).on('keypress', '[data-behavior~=room_speaker]', function(e) {
    if (e.key === 'Enter') {
      chatChannel.speak(e.target.value);
      e.target.value = '';
      return e.preventDefault();
    }
  });
});

