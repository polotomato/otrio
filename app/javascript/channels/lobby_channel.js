import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ( $('#in_lobby').length !== 0 ){
    const objChat = $('#chat-lists');
    objChat.scrollTop(objChat[0].scrollHeight);

    const chatChannel = consumer.subscriptions.create("LobbyChannel", {
      connected() {
        // Called when the subscription is ready for use on the server
        this.perform('get9RoomsDetail', { target: 'user' });
      },

      disconnected() {
        // Called when the subscription has been terminated by the server
      },

      received: function(data) {
        switch (data['status']) {
          case 'chat-message':
            // ロビーチャットにメッセージを追加
            $('#chat-lists').append(data['message']);
            objChat.scrollTop(objChat[0].scrollHeight);
            break;
        
          case 'get9RoomsDetail':
            // 各部屋の参加者数を更新
            const array = data['body'];
            for (let i = 0; i < array.length; i++) {
              $(`[data-players=${i}]`).text(array[i][0]);
              $(`[data-audience=${i}]`).text(array[i][1]);
              // $(`[data-audience=${i}]`).text(array[i][1] - array[i][0]);
            }
            break;
        }
      },

      speak: function(message) {
        return this.perform('speak', {
          message: message
        });
      }
    });

    $(document).on('keypress', '[data-behavior~=room_speaker]', function(e) {
      if (e.key === 'Enter') {
        if (e.target.value.trim() != "")
          chatChannel.speak(e.target.value);
        e.target.value = '';
        return e.preventDefault();
      }
    });
  }
});
