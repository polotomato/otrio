class RoomChannel < ApplicationCable::Channel
  def subscribed
    stop_all_streams
    stream_from "room_channel_#{params['room']}"

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
    RoomMessageBroadcastJob.perform_later({
      status: "user-out",
      room_id: params['room'],
      user_id: current_user.id,
      nickname: current_user.nickname,
      msg: "#{current_user.nickname}さんが退室しました"
    })
  end

  def speak(data)
    RoomMessageBroadcastJob.perform_later({
      status: "user-chat",
      msg: data['message'],
      room_id: params['room'],
      user_nickname: current_user.nickname
    })
  end

  private

  def render_message(message)
    ApplicationController.renderer.render partial: 'rooms/message', locals: { message: message, user_nickname: nil }
  end
end
