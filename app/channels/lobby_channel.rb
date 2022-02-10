class LobbyChannel < ApplicationCable::Channel
  def subscribed
    stop_all_streams
    stream_from "lobby_channel"
    stream_from "user_channel_#{current_user.id}"
  end

  def unsubscribed
    # Any cleanup needed when channel is unsubscribed
  end

  def speak(data)
    Message.create!(content: data['message'], user_id: current_user.id)
  end

  # 各部屋の参加者数を、個人またはロビー全体にアナウンス
  def get9RoomsDetail(data)
    channel = nil
    if data['target'] == 'user'
      channel = "user_channel_#{current_user.id}"
    elsif data['target'] == 'lobby'
      channel = "lobby_channel"
    end

    LobbyDetailBroadcastJob.perform_later(channel)
  end
end
