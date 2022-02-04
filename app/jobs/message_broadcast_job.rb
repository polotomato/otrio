class MessageBroadcastJob < ApplicationJob
  queue_as :default

  def perform(message, nickname)
    ActionCable.server.broadcast 'lobby_channel', message: render_message(message, nickname)
  end



  private

  def render_message(message, nickname)
    ApplicationController.renderer.render partial: 'messages/message', locals: { message: message, user_nickname: nickname }
  end
end
