class RoomChannel < ApplicationCable::Channel
  def subscribed
    stop_all_streams
    stream_from "room_channel_#{params['room']}"
    stream_from "user_channel_#{current_user.id}"

    # 部屋内に自分が入室したことをアナウンス
    RoomMessageBroadcastJob.perform_later({
      status: "user-in",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname,
      msg: "#{current_user.nickname}さんが入室しました"
    })

    # ロビーにもアナウンス
    LobbyDetailBroadcastJob.perform_later "lobby_channel"
  end

  def unsubscribed
    # abort the game if curent_user is a game player and room has a kifu
    #     delete kifu
    #     broadcast abort and reason to room channel

    records = RoomUser.where("user_id = ?", current_user.id)
    records.destroy_all
    records = GamePlayer.where("user_id = ?", current_user.id)
    records.destroy_all
    # 退室したことを部屋内にアナウンス
    RoomMessageBroadcastJob.perform_later({
      status: "user-out",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname,
      msg: "#{current_user.nickname}さんが退室しました"
    })
    
    # ロビーへアナウンス
    LobbyDetailBroadcastJob.perform_later "lobby_channel"

    # 部屋内へアナウンス
    SeatStatusBroadcastJob.perform_later params['room']
  end

  def speak(data)
    RoomMessageBroadcastJob.perform_later({
      status: "user-chat",
      msg: data['message'],
      room_id: params['room'],
      user_nickname: current_user.nickname
    })
  end

  # 対戦席へ移動する場合
  def getToSeat(data)
    room_id = params['room']
    seat_number = data['seat_number']
    if RoomUser.where("room_id = ? AND user_id = ?", room_id, current_user.id).exists?
      unless GamePlayer.where("room_id = ? AND seat = ?", room_id, seat_number).exists?
        records = GamePlayer.where("user_id = ?", current_user.id)
        records.destroy_all
        GamePlayer.create(room_id: room_id, user_id: current_user.id, seat: seat_number)
      end
    end
  end

  # 観戦席へ移動の場合
  def decline
    room_id = params['room']
    records = GamePlayer.where("user_id = ?", current_user.id)
    unless records.empty?
      records.destroy_all
      ActionCable.server.broadcast "room_channel_#{room_id}", {
        status: 'update-game-players',
        body: getGamePlayers()
      }
    end
  end

  # ゲーム参加者一覧を送信
  def getRoomDetail
    ActionCable.server.broadcast "user_channel_#{current_user.id}", {
      status: 'update-game-players',
      body: getGamePlayers()
    }
  end

  # ゲーム開始、初期設定を送信
  def startGame
    # check sender is valid.
    # init setting from GamePlayer
    # decide next player
    # BroadCast to room_channel
    
    ActionCable.server.broadcast "room_channel_#{room_id}", {
      status: 'playing',
      next_player_id: 0
    }
  end

  def move(xy)
    # check sender is valid.
    # update board in memory
    # judge
    # BroadCast next player or draw or end
    # save battle record if end (winner)
    # delete kifu if game end or draw
  end

  private

  def getGamePlayers
    array = {}
    players = GamePlayer.where("room_id = ?", params['room'])
    players.each do |player|
      array[player.seat] = [player.user_id, User.find(player.user_id).nickname] 
    end
    return array
  end

  def render_message(message)
    ApplicationController.renderer.render partial: 'rooms/message', locals: { message: message, user_nickname: nil }
  end
end
