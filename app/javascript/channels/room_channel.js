import consumer from "./consumer"

const chatChannel = consumer.subscriptions.create("RoomChannel", {
  connected() {
    // Called when the subscription is ready for use on the server
  },

  disconnected() {
    // Called when the subscription has been terminated by the server
  },

  received(data) {
    // Called when there's incoming data on the websocket for this channel
    return alert(data['message']);
  },

  speak: function(message) {
    return this.perform('speak', {
      message: message
    });
  }
});

$(document).on('keypress', '[data-behavior~=room_speaker]', function(e) {
  if (e.key === 'Enter'){
    chatChannel.speak(e.target.value);
    e.target.value = '';
    return e.preventDefault();
  }
});