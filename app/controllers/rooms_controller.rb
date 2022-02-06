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
    # 無効な部屋へのアクセスを禁止
    unless @room = Room.find_by(id: params[:id])
      return redirect_to rooms_path
    end

    # 同じ部屋に入ることを禁止
    if RoomUser.find_by(room_id: params[:id], user_id: current_user.id)
      return redirect_to rooms_path
    end

    RoomUser.create(room_id: params[:id], user_id: current_user.id)
  end
end
