import consumer from "./consumer"

// $(function() { ... }); で囲むことでレンダリング後に実行される
$(function() {
  if ($('#in_room').length === 0) return;

  const current_user_id = getUserID();

  const objUserList = $('#user-list');
  const objChat = $('#chat-lists');

  const seatAvailable = [false, false, false, false, false]

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
          // 入室者をアナウンス
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
          // 退室者をアナウンス
          objChat.append(data['message']);
          objChat.scrollTop(objChat[0].scrollHeight);
          // 入室者一覧から削除
          $(`#user-id-${data['user_id']}`).remove();
          break;

        case 'update-game-players':
          // 4つの席を全て再表示
          const body = data['body'];
          const gamePlayerIDs = [];
          for(let i = 1; i <= 4; i++) {
            const seat = $(`[data-seat=${i}]`);
            const p = $(`[data-seat=${i}] > p`)
            if (body[`${i}`] === undefined) {
              seat.attr('data-user_id', "");
              p.text("参加");
              seatAvailable[i] = true;
            } else {
              const user_id  = body[`${i}`][0]
              const nickname = body[`${i}`][1]
              seat.attr('data-user_id', `${user_id}`);
              p.text(`${nickname}`);
              seatAvailable[i] = false;
              gamePlayerIDs.push(user_id.toString());
            }
          }
          // 自分がプレイヤーなら、観戦ボタンを表示
          if (gamePlayerIDs.includes(current_user_id)) {
            $('#btn-decline').css('display', '');
          } else {
            $('#btn-decline').css('display', 'none');
          }

          // プレイヤー4人着席で、seat-1のプレイヤーに開始ボタンを表示
          const owner_id = $('#owner-seat').attr('data-user_id');
          if (owner_id === current_user_id && seatAvailable.every(v => v === false)) {
            $('#btn-start-game').css('display', '');
          } else {
            $('#btn-start-game').css('display', 'none');
          }
          break;

        case 'playing':
          // update board
          // 
          if (data['next_player_id'] === current_user_id){
            // allow to move
            // allow to pass
          }
          break;

        case 'draw':
          // display draw
          // display OK button to reset board and display seats
          break;

        case 'abort':
          // display why abort
          // display OK button to reset board and display seats
          break;

        case 'end':
          // display winner
          // display how to win
          // display OK button to reset board and display seats
          break;
      }
    },

    // サーバーへチャット内容を送信
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

  // Enterでサーバーへチャットを送信
  $(document).on('keypress', '[data-behavior~=room_speaker]', function(e) {
    if (e.key === 'Enter') {
      if (e.target.value.trim() != "")
        chatChannel.speak(e.target.value);
      e.target.value = '';
      return e.preventDefault();
    }
  });

  // 参加ボタン押下
  $('.seat-rings').on('click', function() {
    const i =  $(this).parent().data('seat'); // seat number
    if (seatAvailable[i]) {
      seatAvailable[i] = false; // 連打防止
      chatChannel.perform('getToSeat', { seat_number: i });
    }
  });

  // 観戦するボタン押下
  $('#btn-decline').on('click', function() {
      $(this).css('display', 'none'); // 連打防止
      chatChannel.perform('decline');
  });
  
  // ゲーム開始ボタン押下
  $('#btn-start-game').on('click', function() {
      $(this).css('display', 'none'); // 連打防止
      chatChannel.perform('startGame');
  });

  // 次の一手を押下
  $('.xxxx').on('click', function() {
    if ('cant move') return;

    // 連打防止

    chatChannel.perform('move', 'xy');
  });

  // パスボタン押下
  $('#btn-pass').on('click', function() {
    // 連打防止

    chatChannel.perform('move', '-1');
  });
});

// クッキーからユーザーIDを取得
function getUserID() {
  const cookies = document.cookie;
  const cookiesArray = cookies.split(';');

  for (let c of cookiesArray) {
    const cArray = c.split('=');
    if (cArray[0].trim() == 'user_id'){
      return cArray[1].trim();
    }
  }
}
