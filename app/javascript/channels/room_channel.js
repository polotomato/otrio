import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ( $('#in_room').length !== 0 ){
    const chatChannel = consumer.subscriptions.create({ channel: 'RoomChannel', room: $('#in_room').data('room_id') }, {
      connected() {
        // Called when the subscription is ready for use on the server
      },

      disconnected() {
        // Called when the subscription has been terminated by the server
      },

      received: function(data) {
        return $('#chat-lists').append(data['message']);
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
