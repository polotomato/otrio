class RoomChannel < ApplicationCable::Channel
  def subscribed
    stop_all_streams
    stream_from "room_channel_#{params['room']}"
    stream_from "user_channel_#{current_user.id}"

    RoomMessageBroadcastJob.perform_later({
      status: "user-in",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname,
      msg: "#{current_user.nickname}さんが入室しました"
    })
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
    records = RoomUser.where("user_id = ?", current_user.id)
    records.destroy_all
    records = GamePlayer.where("user_id = ?", current_user.id)
    records.destroy_all
    RoomMessageBroadcastJob.perform_later({
      status: "user-out",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname,
      msg: "#{current_user.nickname}さんが退室しました"
    })
    
    # ロビーへアナウンス
    LobbyDetailBroadcastJob.perform_later("lobby_channel")

    # ルーム内へアナウンス
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

  def getToSeat(data)
    room_id = params['room']
    seat_number = data['seat_number']
    if RoomUser.where("room_id = ? AND user_id = ?", room_id, current_user.id).exists?
      # 観戦席へ移動の場合
      if seat_number == 0
        records = GamePlayer.where("user_id = ?", current_user.id)
        records.destroy_all
        ActionCable.server.broadcast "room_channel_#{room_id}", {
          status: 'update-game-players',
          body: getGamePlayers()
        }
      else
        # 対戦席へ移動する場合
        unless GamePlayer.where("room_id = ? AND seat = ?", room_id, seat_number).exists?
          records = GamePlayer.where("user_id = ?", current_user.id)
          records.destroy_all
          GamePlayer.create(room_id: room_id, user_id: current_user.id, seat: seat_number)
        end
      end
    end
  end

  def getRoomDetail()
    ActionCable.server.broadcast "user_channel_#{current_user.id}", {
      status: 'update-game-players',
      body: getGamePlayers()
    }
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
