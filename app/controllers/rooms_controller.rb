class RoomsController < ApplicationController
  before_action :authenticate_user!, except: :top

  def top
  end
  
  def index
    @rooms = Room.includes(:users)
    @messages = Message.includes(:user).order("id DESC").limit(20)
    @messages = @messages.sort_by { |v| v.created_at }
  end
  
  def show
    unless @room = Room.find_by(id: params[:id])
      redirect_to root_path
    end
  end
end
