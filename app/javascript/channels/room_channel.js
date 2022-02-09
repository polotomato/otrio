import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ($('#in_room').length === 0) return;

  const user_id = getUserID();

  const objUserList = $('#user-list');
  const objChat = $('#chat-lists');

  const chatChannel = consumer.subscriptions.create({ channel: 'RoomChannel', room: $('#in_room').data('room_id') }, {
    connected() {
      // Called when the subscription is ready for use on the server
      this.perform('getRoomDetail');
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

        case 'update-game-players':
          // 4つの席を全て再表示
          const body = data['body'];
          for(let i = 1; i <= 4; i++) {
            const seat = $(`[data-seat=${i}] > [data-user_id]`);
            if (body[`${i}`] === undefined) {
              seat.attr('data-user_id', "");
              seat[0].textContent = "空席";
            } else {
              const user_id  = body[`${i}`][0]
              const nickname = body[`${i}`][1]
              seat.attr('data-user_id', `${user_id}`);
              seat[0].textContent = `${nickname}`;
            }
          }
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
    chatChannel.getToSeat($(this).data('seat'))
  });
});

// クッキーからユーザーIDを取得
function getUserID() {
  const cookies = document.cookie;
  const cookiesArray = cookies.split(';');

  for(let c of cookiesArray){
    const cArray = c.split('=');
    if( cArray[0].trim() == 'user_id'){
      return cArray[1].trim();
    }
  }
}
