class RoomsController < ApplicationController
  before_action :authenticate_user!, except: :top

  def top
  end
  
  def index
    @rooms = Room.all
    @messages = Message.includes(:user).order("created_at ASC").limit(20)
  end
  
  def show
    unless @room = Room.find_by(id: params[:id])
      redirect_to root_path
    end
  end
end
