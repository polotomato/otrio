class RoomsController < ApplicationController
  before_action :authenticate_user!, except: :top

  def top
  end
  
  def index
    @rooms = Room.all
  end
end
