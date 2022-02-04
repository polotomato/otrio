class RoomChannel < ApplicationCable::Channel
  def subscribed
    stream_from "room_channel_#{params['room']}"
    RoomMessageBroadcastJob.perform_later({ room_id: params['room'], msg: "#{current_user.nickname}さんが入室しました" })
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
    RoomMessageBroadcastJob.perform_later({ room_id: params['room'], msg: "#{current_user.nickname}さんが退室しました" })
  end

  def speak(data)
    RoomMessageBroadcastJob.perform_later({ msg: data['message'], room_id: params['room'], user_nickname: current_user.nickname })
  end

  private

  def render_message(message)
    ApplicationController.renderer.render partial: 'messages/message', locals: { message: message, user_nickname: nil }
  end
end
