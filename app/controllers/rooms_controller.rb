class RoomsController < ApplicationController
  def top
  end
  
  def index
    @rooms = Room.all
  end
end
