class RoomChannel < ApplicationCable::Channel
  def subscribed
    stream_from "room_channel_#{params['room']}"
    ActionCable.server.broadcast "room_channel_#{params['room']}", message: render_message("#{current_user.nickname}さんが入室しました")
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
    ActionCable.server.broadcast "room_channel_#{params['room']}", message: render_message("#{current_user.nickname}さんが退室しました")
  end

  def speak(data)
  end

  private

  def render_message(message)
    ApplicationController.renderer.render partial: 'messages/message', locals: { message: message, user_nickname: nil }
  end
end
