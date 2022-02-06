class RoomMessageBroadcastJob < ApplicationJob
  queue_as :default

  def perform(data)
    ActionCable.server.broadcast "room_channel_#{data[:room_id]}", message: render_message({msg: data[:msg], user_nickname: data[:user_nickname]})
  end

  private

  def render_message(data)
    ApplicationController.renderer.render(partial: 'rooms/message',
                                          locals: { message: data[:msg],
                                                    user_nickname: data[:user_nickname]
                                          })
  end
end
