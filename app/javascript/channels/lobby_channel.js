import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ( $('#in_lobby').length !== 0 ){
    const chatChannel = consumer.subscriptions.create("LobbyChannel", {
      connected() {
        // Called when the subscription is ready for use on the server
      },

      disconnected() {
        // Called when the subscription has been terminated by the server
      },

      received: function(data) {
        $('#chat-lists').append(data['message']);
        const objChat = $('#chat-lists');
        objChat.scrollTop(objChat[0].scrollHeight);
      },

      speak: function(message) {
        return this.perform('speak', {
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
  }
});
