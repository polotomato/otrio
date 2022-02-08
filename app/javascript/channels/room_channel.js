import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ($('#in_room').length === 0) return;

  const objUserList = $('#user-list');
  const objChat = $('#chat-lists');

  const chatChannel = consumer.subscriptions.create({ channel: 'RoomChannel', room: $('#in_room').data('room_id') }, {
    connected() {
      // Called when the subscription is ready for use on the server
    },

    disconnected() {
      // Called when the subscription has been terminated by the server
    },

    received: function(data) {
      switch (data['status']){
        case 'user-chat':
          // メッセージを表示
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);
          break;

        case 'user-in':
          // メッセージを表示
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);
          // 入室者一覧に追加
          if ($(`#user-id-${data['user_id']}`).length === 0){
            objUserList.append(`
              <div class="user-name" id="user-id-${data['user_id']}">
                <p>${data['nickname']}</p>
              </div>
            `);
          }
          break;

        case 'user-out':
          // メッセージを表示
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);
          // 入室者一覧から削除
          $(`#user-id-${data['user_id']}`).remove();
          break;

        case 'game-player-in':
          // 席を見つけ、(名前を表示するために)子要素をセレクト
          const seat = $(`[data-seat=${data['seat_number']}] > [data-user_id]`);

          // 同名を避けるために、user_id で判別、属性を書き換え
          seat.attr('data-user_id', `${data['user_id']}`)

          // 名前の表示
          seat[0].textContent = data['nickname'];
          // seat[0].innerHTML = data['nickname'] 装飾するときはこっち
          break;
      }
    },

    speak: function(message) {
      return this.perform('speak', {
        status: 'user-chat',
        message: message
      });
    },

    // 対戦席に着くことを申請する
    getToSeat: function(seat_number) {
      return this.perform('getToSeat', {
        seat_number: seat_number
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

  $('.seats').on('click', function(e) {
    // console.log(e.target.innerHTML);
    // console.log(e.target.id);
    chatChannel.getToSeat($(this).data('seat'))
  });
});
